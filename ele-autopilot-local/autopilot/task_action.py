"""
解析 browser-use `Agent.run()` 返回的 `AgentHistoryList`, 输出结构化 summary / steps / screenshots,
供云端备份使用. 数据结构与方法签名见 browser-use 官方源码 `browser_use.agent.views`.

注意事项:
- action 名称: navigate / search / click / input / scroll / done / read_file / write_file 等;
  不要写成 click_element / input_text.
- `screenshot_path` 是 step 开始时 (LLM 决策那一刻) 的状态截图, 不是动作执行后的画面.
"""

import json
import logging
import platform
import sys
from dataclasses import asdict, dataclass
from dataclasses import is_dataclass
from datetime import datetime
from importlib import metadata
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from browser_use.agent.views import (
    ActionResult,
    AgentHistory,
    AgentHistoryList,
    AgentOutput,
    JudgementResult,
    StepMetadata,
)
from browser_use.browser.views import BrowserStateHistory, TabInfo

logger = logging.getLogger(__name__)

_EPOCH_MS_THRESHOLD = 10_000_000_000  # >= 1e10 认为是毫秒，否则按秒处理


def _coerce_epoch_ms(value: Any) -> int | None:
    """
    尽量把时间值转换为“毫秒时间戳”（epoch ms）。

    支持：
    - datetime
    - int/float（自动判断秒/毫秒）
    - ISO 字符串（尽力解析；失败返回 None）
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        return int(value.timestamp() * 1000)
    if isinstance(value, (int, float)):
        v = float(value)
        if abs(v) >= _EPOCH_MS_THRESHOLD:
            return int(v)
        return int(v * 1000)
    if isinstance(value, str):
        try:
            # 兼容常见的 Z 结尾
            iso = value[:-1] + "+00:00" if value.endswith("Z") else value
            dt = datetime.fromisoformat(iso)
            return int(dt.timestamp() * 1000)
        except Exception:
            return None
    return None


def _coerce_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        try:
            v = float(value)
            # 兼容外部传入毫秒时间戳
            if abs(v) >= _EPOCH_MS_THRESHOLD:
                v = v / 1000.0
            return datetime.fromtimestamp(v)
        except Exception:
            return None
    return None


def _safe_dump(obj: Any) -> Any:
    """
    把对象尽可能转成 JSON 兼容结构（dict/list/str/int/float/bool/None）。

    目标：
    - 固定 pydantic v2（BaseModel.model_dump）
    - 兼容 dataclass（asdict）
    - 兼容 Path / datetime
    """
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj

    if isinstance(obj, datetime):
        return _coerce_epoch_ms(obj)

    if isinstance(obj, Path):
        return str(obj)

    if isinstance(obj, dict):
        converted: dict[str, Any] = {}
        for k, v in obj.items():
            key = str(k)
            if key in {
                "timestamp",
                "created_at",
                "started_at",
                "completed_at",
                "step_start_time",
                "step_end_time",
            }:
                ms = _coerce_epoch_ms(v)
                converted[key] = ms if ms is not None else _safe_dump(v)
                continue
            converted[key] = _safe_dump(v)
        return converted

    if isinstance(obj, (list, tuple, set)):
        return [_safe_dump(v) for v in obj]

    if is_dataclass(obj):
        try:
            return _safe_dump(asdict(obj))
        except Exception:
            pass

    if isinstance(obj, BaseModel):
        return _safe_dump(obj.model_dump(exclude_none=False, mode="json"))

    # 兜底：尽量不要抛异常，返回 string 表示
    try:
        return str(obj)
    except Exception:
        return repr(obj)


def _get_pkg_version(package: str) -> str | None:
    try:
        return metadata.version(package)
    except Exception:
        return None


def _build_runtime_info() -> dict[str, Any]:
    info: dict[str, Any] = {
        "python": {
            "version": sys.version,
            "implementation": platform.python_implementation(),
        },
        "platform": platform.platform(),
        "packages": {
            "browser-use": _get_pkg_version("browser-use"),
            "fastapi": _get_pkg_version("fastapi"),
            "langchain-openai": _get_pkg_version("langchain-openai"),
        },
    }

    try:
        from autopilot.app_meta import project_name, project_version

        info["app"] = {"name": project_name(), "version": project_version()}
    except Exception:
        pass

    return info


@dataclass
class TaskActionSummary:
    """任务执行摘要 - 用于云端上传"""

    # 基本信息
    status: str  # completed / failed / incomplete
    is_done: bool
    is_successful: bool | None
    started_at: int | None  # 毫秒时间戳(epoch ms)
    completed_at: int | None  # 毫秒时间戳(epoch ms)
    duration_seconds: float

    # 执行统计
    total_steps: int
    total_actions: int
    step_error_count: int
    action_error_count: int

    # 结果
    final_result: str | None
    judgement: dict | None
    is_validated: bool | None
    all_extracted_content: list[str]

    # URL 轨迹
    visited_urls: list[str]

    # 动作序列
    action_sequence: list[str]

    # 错误列表
    errors: list[str]
    action_errors: list[str]


@dataclass
class StepDetail:
    """单步执行详情"""

    step_number: int
    url: str | None
    page_title: str | None
    tabs: list[dict]
    state_message: str | None

    # LLM 输出
    thinking: str | None
    thinking_image: str | None
    evaluation: str | None
    memory: str | None
    next_goal: str | None
    model_output: dict | None

    # 结果
    results: list[dict]

    # 时间
    duration_seconds: float | None
    step_start_time: int | None  # 毫秒时间戳(epoch ms)
    step_end_time: int | None  # 毫秒时间戳(epoch ms)
    metadata: dict | None
    state: str | None


class TaskActionHandler:
    """处理 Agent.run() 结果的处理器"""

    def __init__(self, result: AgentHistoryList):
        """
        初始化处理器

        Args:
            result: Agent.run() 返回的 AgentHistoryList 对象
        """
        self.result = result

    def _derive_task_times(self) -> tuple[datetime | None, datetime | None]:
        """尽量从 StepMetadata 中推导任务开始/结束时间。"""
        if not self.result.history:
            return None, None

        starts: list[datetime] = []
        ends: list[datetime] = []

        for history_item in self.result.history:
            md = history_item.metadata
            if not md:
                continue
            st = _coerce_datetime(md.step_start_time)
            et = _coerce_datetime(md.step_end_time)
            if st:
                starts.append(st)
            if et:
                ends.append(et)

        return (min(starts) if starts else None, max(ends) if ends else None)

    def extract_summary(self) -> TaskActionSummary:
        """
        提取任务执行摘要

        Returns:
            TaskActionSummary 对象
        """

        # 错误（step 粒度）列表（过滤 None）
        step_errors = [e for e in self.result.errors() if e is not None]

        # 错误（action 粒度）列表
        action_errors = [r.error for r in self.result.action_results() if r.error]

        # 获取时间信息
        duration = self.result.total_duration_seconds()
        started_at, completed_at = self._derive_task_times()

        if started_at and completed_at:
            duration = max(0.0, (completed_at - started_at).total_seconds())

        is_done = self.result.is_done()
        is_successful = self.result.is_successful()
        if not is_done:
            status = "incomplete"
        else:
            status = "completed" if is_successful is True else "failed"

        return TaskActionSummary(
            status=status,
            is_done=is_done,
            is_successful=is_successful,
            started_at=_coerce_epoch_ms(started_at),
            completed_at=_coerce_epoch_ms(completed_at),
            duration_seconds=duration,
            total_steps=self.result.number_of_steps(),
            total_actions=len(self.result.model_actions()),
            step_error_count=len(step_errors),
            action_error_count=len(action_errors),
            final_result=self.result.final_result(),
            judgement=self.result.judgement(),
            is_validated=self.result.is_validated(),
            all_extracted_content=self.result.extracted_content(),
            visited_urls=[str(u) for u in self.result.urls() if u],
            action_sequence=self.result.action_names(),
            errors=step_errors,
            action_errors=action_errors,
        )

    def extract_step_details(self) -> list[StepDetail]:
        """
        提取每一步的详细信息

        Returns:
            StepDetail 对象列表
        """
        steps = []

        for idx, history_item in enumerate(self.result.history):
            state = history_item.state
            model_output_obj = history_item.model_output
            action_results = history_item.result
            md = history_item.metadata

            # 提取 LLM 输出
            thinking = None
            evaluation = None
            memory = None
            next_goal = None
            model_output_dump: dict | None = None

            if model_output_obj:
                thinking = model_output_obj.thinking
                evaluation = model_output_obj.evaluation_previous_goal
                memory = model_output_obj.memory
                next_goal = model_output_obj.next_goal
                model_output_dump = _safe_dump(model_output_obj)

            # 提取结果（step screen images 在 results 内）
            results = _safe_dump(action_results)

            # 提取时间
            duration = None
            step_start_time = None
            step_end_time = None
            metadata_dump: dict | None = None
            if md:
                duration = md.duration_seconds
                step_start_time = _coerce_epoch_ms(md.step_start_time)
                step_end_time = _coerce_epoch_ms(md.step_end_time)
                metadata_dump = _safe_dump(md)

            # tabs
            tabs = [_safe_dump(t) for t in state.tabs]
            # step screenshot
            thinking_image = state.get_screenshot()

            steps.append(
                StepDetail(
                    step_number=md.step_number if md else (idx + 1),
                    url=state.url,
                    page_title=state.title,
                    tabs=tabs,
                    state_message=history_item.state_message,
                    thinking=thinking,
                    thinking_image=thinking_image,
                    evaluation=evaluation,
                    memory=memory,
                    next_goal=next_goal,
                    model_output=model_output_dump,
                    results=results,
                    duration_seconds=duration,
                    step_start_time=step_start_time,
                    step_end_time=step_end_time,
                    metadata=metadata_dump,
                    state=json.dumps(_safe_dump(state.to_dict())),
                )
            )

        return steps

    def to_cloud_payload(self, config: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        生成用于云端上传的完整 payload

        Args:
            config: 可选的执行配置，将附加到 runtime 中

        Returns:
            可序列化的字典
        """
        summary = self.extract_summary()
        steps = self.extract_step_details()

        runtime = _build_runtime_info()
        if config:
            runtime["config"] = config

        payload: dict[str, Any] = {
            "timestamp": _coerce_epoch_ms(datetime.now()),
            "runtime": runtime,
            "summary": asdict(summary),
            "steps": [asdict(step) for step in steps],
        }

        return _safe_dump(payload)
