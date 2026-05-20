import logging
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr

logger = logging.getLogger(__name__)

from .callback import CallbackClient
from .config import JobConfig
from .task import TaskResult, TaskRunner, TaskStatus
from .task_action import TaskActionHandler


class TaskInput(BaseModel):
    id: str  # 叶子节点 TaskRow id
    text: str


class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.now)
    started_at: datetime | None = None
    completed_at: datetime | None = None
    tasks: list[TaskResult] = Field(default_factory=list)
    config: JobConfig
    callback_url: str | None = None  # Server 回调 URL（有则回调，无则不回调）

    model_config = ConfigDict(arbitrary_types_allowed=True)

    _runner: TaskRunner | None = PrivateAttr(default=None)
    _stop_job: bool = PrivateAttr(default=False)
    _stop_reason: str = PrivateAttr(default="")

    @classmethod
    def create(
        cls,
        tasks: list[str] | list[TaskInput],
        config: JobConfig,
        job_id: str | None = None,
        callback_url: str | None = None,
    ) -> "Job":
        task_results = []
        for idx, task in enumerate(tasks):
            if isinstance(task, TaskInput):
                task_results.append(
                    TaskResult(
                        task=task.text,
                        task_id=task.id,
                        task_index=idx,
                        status=TaskStatus.PENDING,
                    )
                )
            else:
                task_results.append(
                    TaskResult(
                        task=task,
                        task_id="",
                        task_index=idx,
                        status=TaskStatus.PENDING,
                    )
                )

        return cls(
            id=job_id or str(uuid.uuid4()),
            tasks=task_results,
            config=config,
            callback_url=callback_url,
        )

    def stop(self, task_id: str | None = None) -> dict:
        """停止 Job 或当前正在运行的指定 task.

        task_id=None: 停止整个 Job (当前 task 失败 + 剩余 task 跳过).
        task_id=<id>: 只停止当前正在运行且匹配的 task, 后续 task 继续.
        """
        if self.status != TaskStatus.RUNNING:
            return {
                "success": False,
                "message": f"Job is not running (status: {self.status})",
            }

        # 找到当前正在运行的 task
        running_task = next(
            (t for t in self.tasks if t.status == TaskStatus.RUNNING), None
        )

        if task_id is not None:
            # 校验 task_id 是否匹配当前正在运行的 task
            if running_task is None or running_task.task_id != task_id:
                return {
                    "success": False,
                    "message": f"Task {task_id} is not currently running",
                }

        # 停止整个 Job 时额外设置标志，run 循环会跳过剩余 task
        if task_id is None:
            self._stop_job = True
            self._stop_reason = "Job stopped by user request"

        runner = self._runner
        if runner is not None:
            runner.stop_current_task()

        return {
            "success": True,
            "message": "Job stop signal sent" if task_id is None else "Stop signal sent to running task",
            "task_id": running_task.task_id if running_task else None,
            "task_index": running_task.task_index if running_task else None,
        }

    def _update_status(self):
        # 状态机需与 ele-autopilot/lib/db/jobs.ts#syncJobStatusFromTasks 一致.
        if not self.tasks:
            self.status = TaskStatus.PENDING
            return

        if any(t.status == TaskStatus.RUNNING for t in self.tasks):
            self.status = TaskStatus.RUNNING
        elif all(t.status == TaskStatus.COMPLETED for t in self.tasks):
            self.status = TaskStatus.COMPLETED
        elif any(t.status == TaskStatus.PENDING for t in self.tasks):
            self.status = TaskStatus.RUNNING
        elif any(t.status == TaskStatus.FAILED for t in self.tasks):
            self.status = TaskStatus.FAILED
        else:
            self.status = TaskStatus.PENDING

    async def run(self) -> None:
        """顺序执行 tasks, 支持 callback. 未捕获异常时把未完成 task 统一标 FAILED."""
        callback = CallbackClient(self.callback_url)
        self.started_at = datetime.now()
        self.status = TaskStatus.RUNNING

        logger.info(f"Job {self.id} started with config: {self.config.model_dump()}")

        try:
            runner = TaskRunner(config=self.config)
            self._runner = runner
            for idx, task_result in enumerate(self.tasks):
                task_result.task_index = idx

                if self._stop_job:
                    task_result.status = TaskStatus.FAILED
                    task_result.started_at = datetime.now()
                    task_result.completed_at = task_result.started_at
                    task_result.error = self._stop_reason
                    await callback.report_task_update(
                        task_index=idx,
                        task_id=task_result.task_id,
                        status=task_result.status.value,
                        result=None,
                        error=task_result.error,
                        started_at=task_result.started_at,
                        completed_at=task_result.completed_at,
                    )
                    continue

                task_result.status = TaskStatus.RUNNING
                task_result.started_at = datetime.now()

                await callback.report_task_update(
                    task_index=idx,
                    task_id=task_result.task_id,
                    status="running",
                    result=None,
                    started_at=task_result.started_at,
                    completed_at=task_result.started_at,
                )

                cloud_payload: dict[str, Any] | None = None
                try:
                    result = await runner.run(task_result.task)

                    task_result.status = result.status
                    task_result.result = result.result
                    task_result.error = result.error
                    task_result.completed_at = result.completed_at

                    # 浏览器被用户手动关闭 -> 视为整 Job 停止信号 (不覆盖已有的 remote stop).
                    if runner.browser_closed and not self._stop_job:
                        self._stop_job = True
                        self._stop_reason = "Browser was closed during task execution"

                    # Job 层覆盖 TaskRunner 的通用 stop 消息, 让 callback 拿到更精确的原因.
                    if self._stop_job and task_result.status == TaskStatus.FAILED:
                        task_result.error = self._stop_reason

                    if hasattr(result, "_agent_history") and result._agent_history:
                        handler = TaskActionHandler(result._agent_history)
                        cloud_payload = handler.to_cloud_payload(
                            config=self.config.model_dump()
                        )

                except Exception as e:
                    task_result.status = TaskStatus.FAILED
                    task_result.error = str(e)
                    task_result.completed_at = datetime.now()

                await callback.report_task_update(
                    task_index=idx,
                    task_id=task_result.task_id,
                    status=task_result.status.value,
                    result=cloud_payload,
                    error=task_result.error,
                    started_at=task_result.started_at,
                    completed_at=task_result.completed_at,
                )

        except Exception as e:
            # 兜底: 未完成任务统一标 FAILED, 避免 "永远 RUNNING".
            completed_at = datetime.now()
            error = str(e)
            for t in self.tasks:
                if t.status in (TaskStatus.PENDING, TaskStatus.RUNNING):
                    t.status = TaskStatus.FAILED
                    t.completed_at = completed_at
                    t.error = error
        finally:
            self._runner = None
            self._stop_job = False
            self._stop_reason = ""
            self.completed_at = datetime.now()
            self._update_status()

            await callback.report_job_complete(
                status=self.status.value,
                error=None,
                completed_at=self.completed_at,
            )

            await callback.close()
