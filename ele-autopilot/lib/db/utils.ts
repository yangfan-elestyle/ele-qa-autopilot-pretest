import { getDb } from './connection';
import type { Id, SortOrder } from './types';

const ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// 列表 ORDER BY 注入风险点: 前端经 react-admin `sort=[field,order]` 直传, 没有 `?` 绑定能用
// (libSQL/SQLite prepared statement 仅支持值占位符, 列名 / 方向必须字符串拼接). 这里强制按字段白名单 +
// 方向归一化, 命中再拼; 任意不在白名单的字段一律回退到 fallback, 由调用方在 SQL 模板里直接
// `ORDER BY ${buildOrderBy(...)}` 使用, 避免每个 list*Page 各自重复实现.
export function buildOrderBy(
  sort: string | undefined,
  order: SortOrder | undefined,
  allowed: readonly string[],
  fallback: string,
): string {
  const field = sort && allowed.includes(sort) ? sort : null;
  const direction: SortOrder = order === 'ASC' ? 'ASC' : 'DESC';
  return field ? `${field} ${direction}` : fallback;
}

export function generateId(): Id {
  return crypto.randomUUID().toLowerCase();
}

export function isValidId(value: unknown): value is Id {
  return typeof value === 'string' && ID_REGEX.test(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function coercePositiveInt(value: unknown): number | null {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(num) && num > 0 ? num : null;
}

export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function normalizeOrder(order: string | undefined): SortOrder {
  return order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
}

export async function queryAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = getDb();
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const { results } = await stmt.all<T>();
  return results ?? [];
}

export async function queryGet<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const db = getDb();
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const row = await stmt.first<T>();
  return row ?? null;
}

export async function queryRun(
  sql: string,
  params: unknown[] = [],
): Promise<{ changes: number }> {
  const db = getDb();
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const { meta } = await stmt.run();
  return { changes: meta?.changes ?? 0 };
}
