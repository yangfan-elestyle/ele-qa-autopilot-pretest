import type { ActionFunctionArgs } from 'react-router';

import { getJobById, syncJobStatusFromTasks, updateJobById } from '@/lib/db';
import type { JobStatus } from '@/lib/db';
import { isValidId } from '@/lib/db/utils';
import { jsonResponse, methodNotAllowed } from '@/app/lib/api-shared';

const FINAL_STATUSES: JobStatus[] = ['completed', 'failed'];
const TERMINAL_JOB_STATUSES = new Set<JobStatus>(['completed', 'failed']);

function envelope(code: number, message: string, data: unknown = null, status = 200) {
  return jsonResponse({ code, message, data }, { status });
}

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  const rawId = params.id ?? '';
  if (!isValidId(rawId)) {
    return envelope(400, 'Invalid job id', null, 400);
  }

  const job = await getJobById(rawId);
  if (!job) {
    return envelope(404, 'Job not found', null, 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return envelope(400, 'Invalid JSON body', null, 400);
  }

  const payload =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  // status 仅做格式校验, 实际状态由 syncJobStatusFromTasks 从 job_tasks 推导,
  // 避免 local / server 状态机不一致或 callback 乱序导致的抖动.
  const status = payload.status;
  if (typeof status !== 'string' || !FINAL_STATUSES.includes(status as JobStatus)) {
    return envelope(400, 'Invalid status, must be completed or failed', null, 400);
  }

  // 终态幂等: 拒绝 callback 覆盖 completed_at / error, 防止本地 agent 重试污染历史指标.
  if (TERMINAL_JOB_STATUSES.has(job.status)) {
    return envelope(0, 'ignored (job already in terminal state)', null);
  }

  const error = typeof payload.error === 'string' ? payload.error : null;
  const completedAt = typeof payload.completed_at === 'string' ? payload.completed_at : undefined;

  try {
    await updateJobById(rawId, {
      error,
      completed_at: completedAt,
    });
    await syncJobStatusFromTasks(rawId);

    return envelope(0, 'success', null);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return envelope(500, message, null, 500);
  }
}
