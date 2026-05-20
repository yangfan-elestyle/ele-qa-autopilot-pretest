from typing import Union

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from autopilot import get_job_service, TaskStatus, JobConfig
from autopilot.job import TaskInput

router = APIRouter(prefix="/autopilot", tags=["autopilot"])


class AutopilotRunRequest(JobConfig):
    """启动 autopilot Job 的请求体.

    Local 模式: tasks 为字符串列表.
    Server 集成模式: tasks 为 TaskInput 列表, 同时必填 job_id 与 callback_url.
    """

    job_id: str | None = None
    tasks: list[str] | list[TaskInput]
    callback_url: str | None = None


@router.post("/run")
async def run_autopilot(request: AutopilotRunRequest):
    """启动 Job (后台异步). 立即返回 job_id; 用 /autopilot/jobs/{job_id} 查询状态."""
    service = get_job_service()
    try:
        tasks: list[str] | list[TaskInput] = []
        for task in request.tasks:
            if isinstance(task, str):
                tasks.append(task)
            elif isinstance(task, dict):
                tasks.append(
                    TaskInput(id=task.get("id", ""), text=task.get("text", ""))
                )
            elif isinstance(task, TaskInput):
                tasks.append(task)
            else:
                raise ValueError(f"Invalid task format: {task}")

        config = JobConfig.model_validate(
            request.model_dump(exclude={"tasks", "job_id", "callback_url"})
        )
        job = await service.create_job(
            tasks=tasks,
            config=config,
            job_id=request.job_id,
            callback_url=request.callback_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"job_id": job.id, "status": job.status}


@router.get("/status/{job_id}")
async def get_autopilot_status(job_id: str):
    """Job 当前快照 (状态 + 任务列表)."""
    service = get_job_service()
    try:
        return await service.get_job(job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found")


@router.get("/jobs/{job_id}")
async def get_autopilot_job(job_id: str):
    """同 /status/{job_id}, REST 风格别名."""
    return await get_autopilot_status(job_id)


@router.get("/jobs/{job_id}/tasks")
async def list_autopilot_job_tasks(job_id: str):
    """列出 Job 任务 (运行中可查)."""
    service = get_job_service()
    try:
        return await service.get_job_tasks(job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found")


@router.get("/jobs")
async def list_autopilot_jobs(status: TaskStatus | None = None):
    """列出 Job (可按状态筛选, 默认按创建时间倒序)."""
    service = get_job_service()
    return await service.list_jobs(status=status)


class StopRequest(BaseModel):
    task_id: str | None = None


@router.post("/jobs/{job_id}/stop")
async def stop_job(job_id: str, request: StopRequest | None = None):
    """停止 Job 或指定 task.

    无 task_id: 停止整个 Job, 当前 task 失败 + 剩余 task 跳过.
    有 task_id: 只停止当前 RUNNING 且匹配的 task, 后续 task 继续; 不匹配返回 400.
    """
    service = get_job_service()
    task_id = request.task_id if request else None
    try:
        result = await service.stop(job_id, task_id=task_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found")
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.delete("/jobs/{job_id}")
async def delete_autopilot_job(job_id: str):
    """删除 Job 记录 (运行中不允许)."""
    service = get_job_service()
    try:
        await service.delete_job(job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Job deleted"}
