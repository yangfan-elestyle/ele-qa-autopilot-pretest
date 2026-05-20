import type { Id, ListPageArgs, TaskDbRow, TaskRow } from './types';
import { escapeLike, isRecord, generateId, isValidId, queryAll, queryGet, queryRun } from './utils';

async function ensureFolderExists(folderId: Id) {
  const exists = await queryGet<{ ok: 1 }>(`SELECT 1 as ok FROM folders WHERE id = ?`, [folderId]);
  if (!exists) throw new Error('Invalid folder_id');
}

function buildTasksFilterParts(filter: Record<string, unknown>) {
  const where: string[] = [];
  const params: unknown[] = [];

  const q = typeof filter.q === 'string' ? filter.q.trim() : '';
  if (q) {
    where.push(`(t.text LIKE ? ESCAPE '\\' OR t.title LIKE ? ESCAPE '\\')`);
    params.push(`%${escapeLike(q)}%`, `%${escapeLike(q)}%`);
  }

  const folderId = isValidId(filter.folder_id) ? filter.folder_id : null;
  const subtree = filter.subtree === true || filter.include_descendants === true;

  if (Array.isArray(filter.folder_ids)) {
    const ids = (filter.folder_ids as unknown[]).filter(isValidId);
    const unique = Array.from(new Set(ids));
    if (unique.length) {
      where.push(`t.folder_id IN (${unique.map(() => '?').join(',')})`);
      params.push(...unique);
    }
    return { where, params, withClause: '' };
  }

  if (folderId && subtree) {
    return {
      where: [...where, `t.folder_id IN (SELECT id FROM descendants)`],
      params: [folderId, ...params],
      withClause: `
        WITH RECURSIVE descendants(id) AS (
          SELECT id FROM folders WHERE id = ?
          UNION ALL
          SELECT f.id FROM folders f
          JOIN descendants d ON f.parent_id = d.id
        )
      `,
    };
  }

  if (folderId) {
    where.push(`t.folder_id = ?`);
    params.push(folderId);
  }

  return { where, params, withClause: '' };
}

export async function getTaskById(id: Id) {
  const row = await queryGet<TaskDbRow>(
    `
      SELECT t.id, t.folder_id, t.title, t.text, t.sub_ids, t.created_at
      FROM tasks t
      WHERE t.id = ?
    `,
    [id],
  );
  if (!row) return null;
  return toTaskRow(row);
}

export async function getTasksByIds(ids: Id[]) {
  const unique = Array.from(new Set(ids.filter(isValidId)));
  if (unique.length === 0) return [];
  const placeholders = unique.map(() => '?').join(',');
  const rows = await queryAll<TaskDbRow>(
    `
      SELECT t.id, t.folder_id, t.title, t.text, t.sub_ids, t.created_at
      FROM tasks t
      WHERE t.id IN (${placeholders})
      ORDER BY t.created_at DESC
    `,
    unique,
  );
  return rows.map(toTaskRow);
}

export async function listTasksPage(args: ListPageArgs) {
  const { limit, offset } = args;
  const filter = isRecord(args.filter) ? args.filter : {};

  const { where, params, withClause } = buildTasksFilterParts(filter);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const finalParams = [...params, Math.max(1, limit), Math.max(0, offset)];

  const rows = await queryAll<TaskDbRow>(
    `
      ${withClause}
      SELECT t.id, t.folder_id, t.title, t.text, t.sub_ids, t.created_at
      FROM tasks t
      ${whereSql}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `,
    finalParams,
  );
  return rows.map(toTaskRow);
}

export async function countTasks(filter: Record<string, unknown>) {
  const normalized = isRecord(filter) ? filter : {};
  const { where, params, withClause } = buildTasksFilterParts(normalized);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const row = await queryGet<{ total: number }>(
    `
      ${withClause}
      SELECT COUNT(1) as total
      FROM tasks t
      ${whereSql}
    `,
    params,
  );
  return row?.total ?? 0;
}

export async function createTask(input: {
  title?: string;
  text: string;
  folder_id: Id;
  sub_ids?: Id[];
  created_at?: string;
}) {
  const text = input.text.trim();
  if (!text) throw new Error('`text` is required');

  const folderId = input.folder_id;
  if (!isValidId(folderId)) throw new Error('Invalid folder_id');
  await ensureFolderExists(folderId);

  const id = generateId();
  const title = input.title?.trim() || null;
  const subIds = input.sub_ids ?? [];
  if (!Array.isArray(subIds) || !subIds.every(isValidId)) throw new Error('Invalid sub_ids');

  if (input.created_at) {
    await queryRun(
      `INSERT INTO tasks (id, folder_id, title, text, sub_ids, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, folderId, title, text, JSON.stringify(subIds), input.created_at],
    );
  } else {
    await queryRun(
      `INSERT INTO tasks (id, folder_id, title, text, sub_ids) VALUES (?, ?, ?, ?, ?)`,
      [id, folderId, title, text, JSON.stringify(subIds)],
    );
  }
  const task = await getTaskById(id);
  if (!task) throw new Error('Not found');
  return task;
}

export async function createTasks(inputs: { text: string; folder_id: Id; sub_ids?: Id[] }[]) {
  if (!inputs.length) return [];

  const results: Awaited<ReturnType<typeof createTask>>[] = [];
  const baseTime = Date.now();
  for (let i = 0; i < inputs.length; i++) {
    const created_at = new Date(baseTime + i).toISOString();
    results.push(await createTask({ ...inputs[i], created_at }));
  }
  return results;
}

export async function updateTaskById(
  id: Id,
  patch: { title?: string | null; text?: string; folder_id?: Id; sub_ids?: Id[] },
) {
  const existing = await getTaskById(id);
  if (!existing) throw new Error('Not found');

  const nextTitle = patch.title === undefined ? existing.title : patch.title?.trim() || null;
  const nextText = patch.text === undefined ? existing.text : String(patch.text).trim();
  if (!nextText) throw new Error('`text` is required');

  const nextFolderId = patch.folder_id === undefined ? existing.folder_id : patch.folder_id;
  if (!isValidId(nextFolderId)) throw new Error('Invalid folder_id');
  await ensureFolderExists(nextFolderId);

  if (patch.sub_ids === undefined) {
    await queryRun(`UPDATE tasks SET title = ?, text = ?, folder_id = ? WHERE id = ?`, [
      nextTitle,
      nextText,
      nextFolderId,
      id,
    ]);
  } else {
    if (!Array.isArray(patch.sub_ids) || !patch.sub_ids.every(isValidId)) {
      throw new Error('Invalid sub_ids');
    }
    await queryRun(`UPDATE tasks SET title = ?, text = ?, folder_id = ?, sub_ids = ? WHERE id = ?`, [
      nextTitle,
      nextText,
      nextFolderId,
      JSON.stringify(patch.sub_ids),
      id,
    ]);
  }

  const task = await getTaskById(id);
  if (!task) throw new Error('Not found');
  return task;
}

/**
 * 把一组被删除的 task id 从所有父 task 的 sub_ids JSON 链上摘掉.
 * sub_ids 不是 FK, D1 cascade 管不到, 必须显式扫表清理.
 * 不清理会留下悬挂引用: flattenTaskTree 走到时拿不到 task 会 skip (不崩),
 * 但 admin UI 展示 / 导出会带着幽灵 id, 影响数据完整性.
 *
 * 命名后缀 `Unsafe`: 调用方必须保证 deletedIds 对应的 task 已经从表里被删除,
 * 不再校验; folders.ts 的级联删除需要复用, 才暴露成 export.
 */
export async function pruneSubIdReferencesUnsafe(deletedIds: Id[]) {
  if (deletedIds.length === 0) return;
  const deleted = new Set(deletedIds);
  // sub_ids 是 JSON 字符串, SQLite 没办法在 SQL 层做数组项移除 (json_remove 在 D1
  // 上不一定可用); 拉出所有可能含被删 id 的行再回写, 量级可控 (后台总 task 数 << 1e5).
  const candidates = await queryAll<{ id: Id; sub_ids: string }>(
    `SELECT id, sub_ids FROM tasks WHERE sub_ids != '[]'`,
  );
  for (const row of candidates) {
    let arr: unknown;
    try {
      arr = JSON.parse(row.sub_ids);
    } catch {
      continue;
    }
    if (!Array.isArray(arr)) continue;
    const filtered = arr.filter((v) => typeof v === 'string' && !deleted.has(v as Id));
    if (filtered.length === arr.length) continue;
    await queryRun(`UPDATE tasks SET sub_ids = ? WHERE id = ?`, [
      JSON.stringify(filtered),
      row.id,
    ]);
  }
}

export async function deleteTaskById(id: Id): Promise<{ changes: number; jobTaskIds: Id[] }> {
  const jobTaskRows = await queryAll<{ id: Id }>(
    `SELECT jt.id
     FROM job_tasks jt
     JOIN jobs j ON j.id = jt.job_id
     WHERE j.task_id = ?`,
    [id],
  );
  const result = await queryRun(`DELETE FROM tasks WHERE id = ?`, [id]);
  if (result.changes > 0) {
    await pruneSubIdReferencesUnsafe([id]);
  }
  return { changes: result.changes, jobTaskIds: jobTaskRows.map((r) => r.id) };
}

export async function deleteTasksByFolderIds(folderIds: Id[]) {
  const unique = Array.from(new Set(folderIds.filter(isValidId)));
  if (unique.length === 0) return 0;
  const placeholders = unique.map(() => '?').join(',');
  // 先收集即将被删的 task id, 才能在删除后清理其他 task 的 sub_ids 引用.
  const taskRows = await queryAll<{ id: Id }>(
    `SELECT id FROM tasks WHERE folder_id IN (${placeholders})`,
    unique,
  );
  const result = await queryRun(`DELETE FROM tasks WHERE folder_id IN (${placeholders})`, unique);
  if (taskRows.length > 0) {
    await pruneSubIdReferencesUnsafe(taskRows.map((r) => r.id));
  }
  return result.changes;
}

function parseSubIds(raw: string): Id[] {
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? (value as Id[]) : [];
  } catch {
    return [];
  }
}

function toTaskRow(dbRow: TaskDbRow): TaskRow {
  return {
    id: dbRow.id,
    folder_id: dbRow.folder_id,
    title: dbRow.title ?? null,
    text: dbRow.text,
    sub_ids: parseSubIds(dbRow.sub_ids),
    created_at: dbRow.created_at,
  };
}
