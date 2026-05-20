import type { ActionFunctionArgs } from 'react-router';

import { createTask, upsertFolderByPath } from '@/lib/db';
import type { Id } from '@/lib/db';
import {
  jsonError,
  jsonResponse,
  mapDbErrorToStatus,
  methodNotAllowed,
} from '@/app/lib/api-shared';

// 仅 POST. loader 存在是为了把 GET / HEAD 等非法方法收敛到统一 405,
// 否则 RR7 在路由级别抛 "No loader for GET" 并暴露栈, 客户端体验差.
export async function loader() {
  return methodNotAllowed(['POST']);
}

const SOURCE_MAX = 64;
const FOLDER_SEG_MAX = 64;
const TASK_TITLE_MAX = 200;
const TASK_COUNT_LIMIT = 1000;

type IngestTaskInput = {
  title?: string;
  text: string;
};

type IngestChainInput = {
  title?: string;
  text: string;
  subs: IngestTaskInput[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseTaskInput(raw: unknown, label: string): IngestTaskInput {
  if (!isRecord(raw)) {
    throw new Error(`Invalid ${label}: must be object`);
  }

  const title = raw.title;
  let parsedTitle: string | undefined;
  if (title === undefined || title === null) {
    parsedTitle = undefined;
  } else if (typeof title === 'string') {
    if (title.length > TASK_TITLE_MAX) {
      throw new Error(`Invalid ${label}.title: max ${TASK_TITLE_MAX} chars`);
    }
    parsedTitle = title;
  } else {
    throw new Error(`Invalid ${label}.title: must be string`);
  }

  const text = raw.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error(`Invalid ${label}.text: required non-empty string`);
  }

  return { title: parsedTitle, text };
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  if (!isRecord(body)) {
    return jsonError('Request body must be an object', 400);
  }

  const sourceRaw = body.source;
  if (typeof sourceRaw !== 'string') {
    return jsonError('`source` must be a string', 400);
  }
  const source = sourceRaw.trim();
  if (!source || source.length > SOURCE_MAX) {
    return jsonError(`\`source\` must be 1..${SOURCE_MAX} chars`, 400);
  }

  const folderPathRaw = body.folder_path;
  if (!Array.isArray(folderPathRaw) || folderPathRaw.length === 0) {
    return jsonError('`folder_path` must be a non-empty array of strings', 400);
  }
  const folderPath: string[] = [];
  for (const seg of folderPathRaw) {
    if (typeof seg !== 'string') {
      return jsonError('`folder_path` segments must be strings', 400);
    }
    const trimmed = seg.trim();
    if (!trimmed || trimmed.length > FOLDER_SEG_MAX) {
      return jsonError(
        `\`folder_path\` segments must be non-empty strings of ≤${FOLDER_SEG_MAX} chars`,
        400,
      );
    }
    folderPath.push(trimmed);
  }

  const tasks: IngestTaskInput[] = [];
  const tasksRaw = body.tasks;
  if (tasksRaw !== undefined && tasksRaw !== null) {
    if (!Array.isArray(tasksRaw)) {
      return jsonError('`tasks` must be an array', 400);
    }
    try {
      for (let i = 0; i < tasksRaw.length; i++) {
        tasks.push(parseTaskInput(tasksRaw[i], `tasks[${i}]`));
      }
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : 'Invalid tasks', 400);
    }
  }

  let chain: IngestChainInput | null = null;
  const chainRaw = body.chain;
  if (chainRaw !== undefined && chainRaw !== null) {
    if (!isRecord(chainRaw)) {
      return jsonError('`chain` must be an object', 400);
    }
    const subsRaw = chainRaw.subs;
    if (!Array.isArray(subsRaw) || subsRaw.length === 0) {
      return jsonError('`chain.subs` must be a non-empty array', 400);
    }
    try {
      const head = parseTaskInput({ title: chainRaw.title, text: chainRaw.text }, 'chain');
      const subs: IngestTaskInput[] = [];
      for (let i = 0; i < subsRaw.length; i++) {
        subs.push(parseTaskInput(subsRaw[i], `chain.subs[${i}]`));
      }
      chain = { title: head.title, text: head.text, subs };
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : 'Invalid chain', 400);
    }
  }

  const total = tasks.length + (chain ? 1 + chain.subs.length : 0);
  if (total === 0) {
    return jsonError('`tasks` and `chain` cannot both be empty', 400);
  }
  if (total > TASK_COUNT_LIMIT) {
    return jsonError(`Total task count must be ≤ ${TASK_COUNT_LIMIT}`, 400);
  }

  try {
    const folder = await upsertFolderByPath(folderPath);
    const folderId = folder.id;

    const createdTasks: { id: Id }[] = [];
    for (const t of tasks) {
      const task = await createTask({
        folder_id: folderId,
        title: t.title,
        text: t.text,
        source,
      });
      createdTasks.push({ id: task.id });
    }

    let chainResult: { id: Id; sub_ids: Id[] } | undefined;
    if (chain) {
      const subIds: Id[] = [];
      for (const s of chain.subs) {
        const sub = await createTask({
          folder_id: folderId,
          title: s.title,
          text: s.text,
          source,
        });
        subIds.push(sub.id);
      }
      const chainTask = await createTask({
        folder_id: folderId,
        title: chain.title,
        text: chain.text,
        sub_ids: subIds,
        source,
      });
      chainResult = { id: chainTask.id, sub_ids: subIds };
    }

    return jsonResponse(
      {
        code: 0,
        message: 'success',
        data: {
          folder_id: folderId,
          tasks: createdTasks,
          ...(chainResult ? { chain: chainResult } : {}),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonError(message, mapDbErrorToStatus(message));
  }
}
