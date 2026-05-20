import asyncio
import logging

from .config import JobConfig
from .job import Job, TaskInput
from .task import TaskResult, TaskStatus

logger = logging.getLogger(__name__)


class JobService:
    """Job 生命周期管理. 单进程内存存储; 多实例需替换为 Redis / DB."""

    def __init__(self):
        self._jobs: dict[str, Job] = {}
        self._lock = asyncio.Lock()

    async def create_job(
        self,
        tasks: list[str] | list[TaskInput],
        config: JobConfig,
        job_id: str | None = None,
        callback_url: str | None = None,
    ) -> Job:
        if not tasks:
            raise ValueError("tasks cannot be empty")

        job = Job.create(
            tasks=tasks,
            config=config,
            job_id=job_id,
            callback_url=callback_url,
        )

        async with self._lock:
            self._jobs[job.id] = job

        asyncio.create_task(self._run_job(job.id))

        return job

    async def get_job(self, job_id: str) -> Job:
        async with self._lock:
            job = self._jobs.get(job_id)
        if not job:
            raise KeyError("Job not found")
        return job

    async def list_jobs(self, status: TaskStatus | None = None) -> list[Job]:
        async with self._lock:
            jobs = list(self._jobs.values())
        if status:
            jobs = [j for j in jobs if j.status == status]
        jobs.sort(key=lambda j: j.created_at, reverse=True)
        return jobs

    async def get_job_tasks(self, job_id: str) -> list[TaskResult]:
        job = await self.get_job(job_id)
        return job.tasks

    async def stop(self, job_id: str, task_id: str | None = None) -> dict:
        job = await self.get_job(job_id)
        return job.stop(task_id=task_id)

    async def delete_job(self, job_id: str) -> None:
        job = await self.get_job(job_id)
        if job.status == TaskStatus.RUNNING:
            raise ValueError("Cannot delete a running job")
        async with self._lock:
            self._jobs.pop(job_id, None)

    async def _run_job(self, job_id: str) -> None:
        try:
            job = await self.get_job(job_id)
        except KeyError:
            return

        try:
            await job.run()
        except Exception as e:
            # Job.run 内部已有兜底; 这里仅防止 background task 泄漏异常.
            logger.exception("Unexpected error while running job_id=%s: %s", job_id, e)


_job_service_singleton: JobService | None = None


def get_job_service() -> JobService:
    global _job_service_singleton
    if _job_service_singleton is None:
        _job_service_singleton = JobService()
    return _job_service_singleton
