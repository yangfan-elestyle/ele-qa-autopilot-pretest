"""
回调客户端：Local 主动回调 Server 更新状态

职责：
- 上报单个 task 状态（包含完整执行结果）
- 上报 Job 完成状态

可靠性：
- 默认 3 次尝试 + 指数退避 (1s/2s/4s).
- 仅对网络错误 / 5xx / 408 / 429 重试; 4xx (含 400/404/422) 即时返回,
  防止 client 端 schema 不匹配反复打 server.
- 重试期间维持 30s 单次超时, 总最坏 ~37s; 任务执行链路对回调失败已是
  "尽力而为" (job.py / task.py 仍会继续推进), 多撑一会更稳但不必无限.
"""

import asyncio
import logging
from datetime import datetime
from typing import Any

import httpx

logger = logging.getLogger(__name__)

DEFAULT_RETRIES = 3
RETRY_BACKOFF_BASE_SECONDS = 1.0
RETRYABLE_STATUS = {408, 429, 500, 502, 503, 504}


class CallbackClient:
    """回调客户端（Local 主动回调 Server）"""

    def __init__(self, callback_url: str | None):
        """
        初始化回调客户端

        Args:
            callback_url: Server 的回调基础 URL，格式：http://server-host:port/api/jobs/{job_id}/callback
                         如果为 None，则不执行回调（Local 独立运行模式）
        """
        self.callback_url = callback_url
        self.client = httpx.AsyncClient(timeout=30.0) if callback_url else None

    async def _post_with_retry(
        self, url: str, payload: dict[str, Any], label: str
    ) -> bool:
        """指数退避重试 POST. 成功返回 True; 4xx 不可重试时直接返回 False."""
        assert self.client is not None
        last_status: int | None = None
        for attempt in range(1, DEFAULT_RETRIES + 1):
            try:
                response = await self.client.post(url, json=payload)
                last_status = response.status_code
                if response.status_code == 200:
                    return True
                if response.status_code not in RETRYABLE_STATUS:
                    logger.warning(
                        "%s returned non-retryable %d (attempt %d): %s",
                        label,
                        response.status_code,
                        attempt,
                        response.text[:500],
                    )
                    return False
                logger.warning(
                    "%s returned retryable %d (attempt %d/%d): %s",
                    label,
                    response.status_code,
                    attempt,
                    DEFAULT_RETRIES,
                    response.text[:500],
                )
            except httpx.HTTPError as e:
                logger.warning(
                    "%s network error (attempt %d/%d): %s",
                    label,
                    attempt,
                    DEFAULT_RETRIES,
                    e,
                )
            except Exception as e:  # noqa: BLE001
                logger.warning(
                    "%s unexpected error (attempt %d/%d): %s",
                    label,
                    attempt,
                    DEFAULT_RETRIES,
                    e,
                )
            if attempt < DEFAULT_RETRIES:
                await asyncio.sleep(RETRY_BACKOFF_BASE_SECONDS * (2 ** (attempt - 1)))
        logger.warning(
            "%s gave up after %d attempts (last status: %s)",
            label,
            DEFAULT_RETRIES,
            last_status,
        )
        return False

    async def report_task_update(
        self,
        task_index: int,
        task_id: str,
        status: str,
        result: dict[str, Any] | None = None,
        error: str | None = None,
        started_at: datetime | None = None,
        completed_at: datetime | None = None,
    ) -> bool:
        """
        上报单个 task 状态到 Server

        重要：result 包含完整的执行结果（参考 task_action_out.template.json），
        数据量可能很大，但需要全量上传，后续在 UI 中展示。

        Args:
            task_index: 任务在 flat 数组中的索引
            task_id: 来源的叶子节点 TaskRow id
            status: 任务状态（running / completed / failed）
            result: 完整执行结果（TaskActionResult）
            error: 错误信息（status=failed 时有值）
            started_at: 开始时间
            completed_at: 完成时间

        Returns:
            回调是否成功
        """
        if not self.client:
            return True  # 无回调 URL，视为成功

        payload = {
            "task_index": task_index,
            "task_id": task_id,
            "status": status,
            "result": result,
            "error": error,
            "started_at": started_at.isoformat() if started_at else None,
            "completed_at": completed_at.isoformat() if completed_at else None,
        }

        url = f"{self.callback_url}/task"
        return await self._post_with_retry(url, payload, f"Task callback ({status})")

    async def report_job_complete(
        self,
        status: str,
        error: str | None = None,
        completed_at: datetime | None = None,
    ) -> bool:
        """
        上报 Job 完成到 Server

        Args:
            status: Job 最终状态（completed / failed）
            error: 错误信息（status=failed 时有值）
            completed_at: 完成时间

        Returns:
            回调是否成功
        """
        if not self.client:
            return True  # 无回调 URL，视为成功

        payload = {
            "status": status,
            "error": error,
            "completed_at": completed_at.isoformat() if completed_at else None,
        }

        url = f"{self.callback_url}/complete"
        return await self._post_with_retry(url, payload, f"Job complete callback ({status})")

    async def close(self) -> None:
        """关闭 HTTP 客户端"""
        if self.client:
            await self.client.aclose()
            self.client = None
