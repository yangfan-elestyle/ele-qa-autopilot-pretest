import type { Id } from '@/lib/db';
import { isValidId } from '@/lib/db/utils';

type SortValue = [string, string];

type RangeValue = [number, number];

type ListParams = {
  sort: SortValue;
  range: RangeValue;
  filter: Record<string, unknown>;
};

const JSON_HEADER = { 'Content-Type': 'application/json; charset=utf-8' };

export function jsonResponse<T>(data: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADER, ...(init?.headers ?? {}) },
  });
}

export function jsonError(message: string, status = 400): Response {
  return jsonResponse({ error: message }, { status });
}

export function parseIdParam(raw: string): Id | null {
  return isValidId(raw) ? raw : null;
}

export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// 单次列表查询硬上限. 防止前端传 [0, 1e9] 这种极端 range 拖垮 D1.
// react-admin 默认分页 ≤100, 这里 1000 是兼容旧导出用例的安全余量.
const MAX_RANGE_SPAN = 1000;

export function parseListParams(request: Request): ListParams {
  const url = new URL(request.url);

  const sort = safeJsonParse<SortValue>(url.searchParams.get('sort'), ['created_at', 'DESC']);
  const rawRange = safeJsonParse<RangeValue>(url.searchParams.get('range'), [0, 24]);
  const filter = safeJsonParse<Record<string, unknown>>(url.searchParams.get('filter'), {});

  const start = Number.isFinite(rawRange[0]) ? Math.max(0, Math.floor(rawRange[0])) : 0;
  const rawEnd = Number.isFinite(rawRange[1]) ? Math.floor(rawRange[1]) : start + 24;
  const end = Math.min(rawEnd, start + MAX_RANGE_SPAN - 1);

  return { sort, range: [start, end], filter };
}

export function withContentRange(resource: string, start: number, end: number, total: number) {
  const headers = new Headers(JSON_HEADER);
  headers.set('Content-Range', `${resource} ${start}-${end}/${total}`);
  headers.set('Access-Control-Expose-Headers', 'Content-Range');
  return headers;
}

export function mapDbErrorToStatus(message: string) {
  const normalized = message.toLowerCase();
  if (normalized === 'not found' || normalized.endsWith(' not found')) {
    return 404;
  }
  // D1 / SQLite 外键违反: ON DELETE RESTRICT 命中时抛 SQLITE_CONSTRAINT_FOREIGNKEY,
  // 直接落到 mapDbErrorToStatus 里会被识别成 500. 实际语义是"资源仍被引用,
  // 删不了" → 409 Conflict 更准.
  if (
    normalized.includes('foreign key constraint') ||
    normalized.includes('sqlite_constraint_foreignkey')
  ) {
    return 409;
  }
  if (
    normalized.includes('invalid') ||
    normalized.includes('required') ||
    normalized.includes('subfolders') ||
    normalized.includes('has tasks')
  ) {
    return 400;
  }
  return 500;
}

export function methodNotAllowed(allow: string[]): Response {
  return jsonResponse(
    { error: `Method not allowed` },
    { status: 405, headers: { Allow: allow.join(', ') } },
  );
}
