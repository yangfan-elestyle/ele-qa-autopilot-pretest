import type {
  Id,
  JobConfig,
  JobDbRow,
  JobRow,
  JobStatus,
  JobTaskDbRow,
  JobTaskLiteRow,
  JobTaskRow,
  JobWithTasks,
  JobWithTasksLite,
  ListPageArgs,
  TaskActionResult,
} from './types';
import { buildOrderBy, generateId, isRecord, isValidId, queryAll, queryGet, queryRun } from './utils';
import { getDb } from './connection';
import { getTaskById } from './tasks';

async function ensureTaskExists(taskId: Id) {
  const exists = await queryGet<{ ok: 1 }>(`SELECT 1 as ok FROM tasks WHERE id = ?`, [taskId]);
  if (!exists) throw new Error('Invalid task_id');
}

function parseConfig(raw: string): JobConfig {
  try {
    const value = JSON.parse(raw) as unknown;
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

function parseResult(raw: string | null): TaskActionResult | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TaskActionResult;
  } catch {
    return null;
  }
}

function toJobRow(dbRow: JobDbRow): JobRow {
  return {
    id: dbRow.id,
    task_id: dbRow.task_id,
    status: dbRow.status as JobStatus,
    config: parseConfig(dbRow.config),
    created_at: dbRow.created_at,
    started_at: dbRow.started_at,
    completed_at: dbRow.completed_at,
    error: dbRow.error,
  };
}

function toJobTaskRow(dbRow: JobTaskDbRow): JobTaskRow {
  return {
    id: dbRow.id,
    job_id: dbRow.job_id,
    task_id: dbRow.task_id,
    task_index: dbRow.task_index,
    task_title: dbRow.task_title ?? null,
    task_text: dbRow.task_text,
    status: dbRow.status as JobStatus,
    result: parseResult(dbRow.result),
    error: dbRow.error,
    started_at: dbRow.started_at,
    completed_at: dbRow.completed_at,
  };
}

function toJobTaskLiteRow(dbRow: JobTaskDbRow): JobTaskLiteRow {
  return {
    id: dbRow.id,
    job_id: dbRow.job_id,
    task_id: dbRow.task_id,
    task_index: dbRow.task_index,
    task_title: dbRow.task_title ?? null,
    task_text: dbRow.task_text,
    status: dbRow.status as JobStatus,
    result_summary: null,
    error: dbRow.error,
    started_at: dbRow.started_at,
    completed_at: dbRow.completed_at,
  };
}

// 递归展开 sub_ids 链, 返回所有叶子节点.
async function flattenTaskTree(
  taskId: Id,
  visited: Set<Id> = new Set(),
): Promise<Array<{ id: Id; title: string | null; text: string }>> {
  if (visited.has(taskId)) return [];
  visited.add(taskId);

  const task = await getTaskById(taskId);
  if (!task) return [];

  if (!task.sub_ids || task.sub_ids.length === 0) {
    return [{ id: task.id, title: task.title ?? null, text: task.text }];
  }

  const result: Array<{ id: Id; title: string | null; text: string }> = [];
  for (const subId of task.sub_ids) {
    result.push(...(await flattenTaskTree(subId, visited)));
  }
  return result;
}

export async function getJobById(id: Id): Promise<JobRow | null> {
  const row = await queryGet<JobDbRow>(
    `
      SELECT id, task_id, status, config, created_at, started_at, completed_at, error
      FROM jobs
      WHERE id = ?
    `,
    [id],
  );
  if (!row) return null;
  return toJobRow(row);
}

export async function getJobWithTasks(id: Id): Promise<JobWithTasks | null> {
  const job = await getJobById(id);
  if (!job) return null;

  const taskRows = await queryAll<JobTaskDbRow>(
    `
      SELECT id, job_id, task_id, task_index, task_title, task_text, status, result, error, started_at, completed_at
      FROM job_tasks
      WHERE job_id = ?
      ORDER BY task_index ASC
    `,
    [id],
  );

  return {
    ...job,
    tasks: taskRows.map(toJobTaskRow),
  };
}

export async function getJobWithTasksLite(id: Id): Promise<JobWithTasksLite | null> {
  const job = await getJobById(id);
  if (!job) return null;

  const taskRows = await queryAll<
    Omit<JobTaskDbRow, 'result'> & {
      result?: null;
    }
  >(
    `
      SELECT id, job_id, task_id, task_index, task_title, task_text, status, error, started_at, completed_at
      FROM job_tasks
      WHERE job_id = ?
      ORDER BY task_index ASC
    `,
    [id],
  );

  return {
    ...job,
    tasks: taskRows.map((row) => toJobTaskLiteRow({ ...row, result: null })),
  };
}

const JOB_SORT_FIELDS = ['id', 'task_id', 'status', 'created_at', 'started_at', 'completed_at'] as const;

export async function listJobsPage(args: ListPageArgs): Promise<JobRow[]> {
  const { limit, offset, filter, sort, order } = args;
  const where: string[] = [];
  const params: unknown[] = [];

  if (isRecord(filter)) {
    if (isValidId(filter.task_id)) {
      where.push(`task_id = ?`);
      params.push(filter.task_id);
    }
    if (
      typeof filter.status === 'string' &&
      ['pending', 'running', 'completed', 'failed'].includes(filter.status)
    ) {
      where.push(`status = ?`);
      params.push(filter.status);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = buildOrderBy(sort, order, JOB_SORT_FIELDS, 'created_at DESC');
  const finalParams = [...params, Math.max(1, limit), Math.max(0, offset)];

  const rows = await queryAll<JobDbRow>(
    `
      SELECT id, task_id, status, config, created_at, started_at, completed_at, error
      FROM jobs
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `,
    finalParams,
  );
  return rows.map(toJobRow);
}

export async function countJobs(filter?: Record<string, unknown>): Promise<number> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (isRecord(filter)) {
    if (isValidId(filter.task_id)) {
      where.push(`task_id = ?`);
      params.push(filter.task_id);
    }
    if (
      typeof filter.status === 'string' &&
      ['pending', 'running', 'completed', 'failed'].includes(filter.status)
    ) {
      where.push(`status = ?`);
      params.push(filter.status);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const row = await queryGet<{ total: number }>(
    `SELECT COUNT(1) as total FROM jobs ${whereSql}`,
    params,
  );
  return row?.total ?? 0;
}

export async function createJob(input: { task_id: Id; config?: JobConfig }): Promise<JobWithTasks> {
  const taskId = input.task_id;
  if (!isValidId(taskId)) throw new Error('Invalid task_id');
  await ensureTaskExists(taskId);

  const config = input.config ?? {};
  const now = new Date().toISOString();
  const jobId = generateId();

  const flatTasks = await flattenTaskTree(taskId);
  if (flatTasks.length === 0) {
    const task = await getTaskById(taskId);
    if (task) {
      flatTasks.push({ id: task.id, title: task.title ?? null, text: task.text });
    }
  }

  if (flatTasks.length === 0) {
    throw new Error('No tasks to execute');
  }

  // D1 batch: 整个 job + job_tasks 链原子写入. 任一条失败整体回滚, 避免
  // 半成品 job (jobs 写入但 job_tasks 缺失) 留在表里.
  // started_at 留空: pending 阶段还未真正启动, 由 syncJobStatusFromTasks 在状态
  // 首次推进到 running 时回填, 避免前端把"创建 -> 启动"的等待时长算进任务耗时.
  const db = getDb();
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO jobs (id, task_id, status, config, created_at, started_at) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(jobId, taskId, 'pending', JSON.stringify(config), now, null),
  ];
  for (let i = 0; i < flatTasks.length; i++) {
    const ft = flatTasks[i];
    const jtId = generateId();
    statements.push(
      db
        .prepare(
          `INSERT INTO job_tasks (id, job_id, task_id, task_index, task_title, task_text, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(jtId, jobId, ft.id, i, ft.title, ft.text, 'pending'),
    );
  }
  await db.batch(statements);

  const result = await getJobWithTasks(jobId);
  if (!result) throw new Error('Failed to create job');
  return result;
}

export async function updateJobById(
  id: Id,
  patch: {
    status?: JobStatus;
    error?: string | null;
    started_at?: string;
    completed_at?: string;
  },
): Promise<JobRow | null> {
  const existing = await getJobById(id);
  if (!existing) return null;

  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (patch.status !== undefined) {
    setClauses.push('status = ?');
    params.push(patch.status);
  }
  if (patch.error !== undefined) {
    setClauses.push('error = ?');
    params.push(patch.error);
  }
  if (patch.started_at !== undefined) {
    setClauses.push('started_at = ?');
    params.push(patch.started_at);
  }
  if (patch.completed_at !== undefined) {
    setClauses.push('completed_at = ?');
    params.push(patch.completed_at);
  }

  if (setClauses.length === 0) return existing;

  params.push(id);
  await queryRun(`UPDATE jobs SET ${setClauses.join(', ')} WHERE id = ?`, params);

  return await getJobById(id);
}

export async function deleteJobById(id: Id): Promise<{ changes: number; jobTaskIds: Id[] }> {
  const jobTaskRows = await queryAll<{ id: Id }>(
    `SELECT id FROM job_tasks WHERE job_id = ?`,
    [id],
  );
  const result = await queryRun(`DELETE FROM jobs WHERE id = ?`, [id]);
  return { changes: result.changes, jobTaskIds: jobTaskRows.map((r) => r.id) };
}

/**
 * 给级联清理 R2 截图用: 返回一组 task 关联的所有 job_task id.
 * 内部走 jobs.task_id → job_tasks 两段查询, 跟 D1 cascade 链路一致.
 */
export async function getJobTaskIdsByTaskIds(taskIds: Id[]): Promise<Id[]> {
  if (taskIds.length === 0) return [];
  const placeholders = taskIds.map(() => '?').join(',');
  const rows = await queryAll<{ id: Id }>(
    `SELECT jt.id
     FROM job_tasks jt
     JOIN jobs j ON j.id = jt.job_id
     WHERE j.task_id IN (${placeholders})`,
    taskIds,
  );
  return rows.map((r) => r.id);
}

export async function getJobTasksByJobId(jobId: Id): Promise<JobTaskRow[]> {
  const rows = await queryAll<JobTaskDbRow>(
    `
      SELECT id, job_id, task_id, task_index, task_title, task_text, status, result, error, started_at, completed_at
      FROM job_tasks
      WHERE job_id = ?
      ORDER BY task_index ASC
    `,
    [jobId],
  );
  return rows.map(toJobTaskRow);
}

export async function getJobTaskByIndex(jobId: Id, taskIndex: number): Promise<JobTaskRow | null> {
  const row = await queryGet<JobTaskDbRow>(
    `
      SELECT id, job_id, task_id, task_index, task_title, task_text, status, result, error, started_at, completed_at
      FROM job_tasks
      WHERE job_id = ? AND task_index = ?
    `,
    [jobId, taskIndex],
  );
  return row ? toJobTaskRow(row) : null;
}

export async function updateJobTaskByIndex(
  jobId: Id,
  taskIndex: number,
  patch: {
    status?: JobStatus;
    result?: TaskActionResult | null;
    error?: string | null;
    started_at?: string;
    completed_at?: string;
  },
): Promise<JobTaskRow | null> {
  const row = await queryGet<JobTaskDbRow>(
    `
      SELECT id, job_id, task_id, task_index, task_title, task_text, status, result, error, started_at, completed_at
      FROM job_tasks
      WHERE job_id = ? AND task_index = ?
    `,
    [jobId, taskIndex],
  );
  if (!row) return null;

  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (patch.status !== undefined) {
    setClauses.push('status = ?');
    params.push(patch.status);
  }
  if (patch.result !== undefined) {
    setClauses.push('result = ?');
    params.push(patch.result ? JSON.stringify(patch.result) : null);
  }
  if (patch.error !== undefined) {
    setClauses.push('error = ?');
    params.push(patch.error);
  }
  if (patch.started_at !== undefined) {
    setClauses.push('started_at = ?');
    params.push(patch.started_at);
  }
  if (patch.completed_at !== undefined) {
    setClauses.push('completed_at = ?');
    params.push(patch.completed_at);
  }

  if (setClauses.length === 0) return toJobTaskRow(row);

  params.push(row.id);
  await queryRun(`UPDATE job_tasks SET ${setClauses.join(', ')} WHERE id = ?`, params);

  const updated = await queryGet<JobTaskDbRow>(
    `
      SELECT id, job_id, task_id, task_index, task_title, task_text, status, result, error, started_at, completed_at
      FROM job_tasks
      WHERE id = ?
    `,
    [row.id],
  );
  return updated ? toJobTaskRow(updated) : null;
}

export async function syncJobStatusFromTasks(jobId: Id): Promise<JobRow | null> {
  const tasks = await getJobTasksByJobId(jobId);
  if (tasks.length === 0) return await getJobById(jobId);

  // 状态机:
  //   1. 任一 running     -> running
  //   2. 全 completed     -> completed
  //   3. 任一 pending     -> running  (job 仍在推进, 即使已有 task failed; 这是
  //                                    callback 异步到达时的中间态, 避免被过早
  //                                    标记 failed 后又被后到的 callback 抖回)
  //   4. 任一 failed      -> failed   (没有 pending / running, 终态)
  //   5. 兜底             -> pending
  let newStatus: JobStatus;
  if (tasks.some((t) => t.status === 'running')) {
    newStatus = 'running';
  } else if (tasks.every((t) => t.status === 'completed')) {
    newStatus = 'completed';
  } else if (tasks.some((t) => t.status === 'pending')) {
    newStatus = 'running';
  } else if (tasks.some((t) => t.status === 'failed')) {
    newStatus = 'failed';
  } else {
    newStatus = 'pending';
  }

  const patch: { status: JobStatus; started_at?: string } = { status: newStatus };

  // jobs.started_at 在创建时留空, 这里第一次推进到非 pending 时回填:
  // 优先用最早一个有 started_at 的 task 时间, 缺失时退化到 now. 已写入的不动,
  // 保留首次启动时间.
  if (newStatus !== 'pending') {
    const job = await getJobById(jobId);
    if (job && !job.started_at) {
      const earliest = tasks
        .map((t) => t.started_at)
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .sort()[0];
      patch.started_at = earliest ?? new Date().toISOString();
    }
  }

  return await updateJobById(jobId, patch);
}

export type JobStats = {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
};

export async function getJobStatsByTaskIds(taskIds: Id[]): Promise<Map<Id, JobStats>> {
  const result = new Map<Id, JobStats>();
  if (taskIds.length === 0) return result;

  for (const id of taskIds) {
    result.set(id, { total: 0, completed: 0, failed: 0, running: 0, pending: 0 });
  }

  const placeholders = taskIds.map(() => '?').join(', ');

  const rows = await queryAll<{ task_id: string; status: string; cnt: number }>(
    `
      SELECT task_id, status, COUNT(*) as cnt
      FROM jobs
      WHERE task_id IN (${placeholders})
      GROUP BY task_id, status
    `,
    taskIds,
  );

  for (const row of rows) {
    const stats = result.get(row.task_id);
    if (!stats) continue;

    stats.total += row.cnt;
    switch (row.status) {
      case 'completed':
        stats.completed = row.cnt;
        break;
      case 'failed':
        stats.failed = row.cnt;
        break;
      case 'running':
        stats.running = row.cnt;
        break;
      case 'pending':
        stats.pending = row.cnt;
        break;
    }
  }

  return result;
}
