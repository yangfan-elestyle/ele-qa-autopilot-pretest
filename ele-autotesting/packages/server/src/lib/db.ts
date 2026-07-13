/**
 * 迁移前置 (A3): DB 客户端 seam.
 *
 * `Db` 只覆盖本仓实际用到的 D1 表面 (prepare / bind / all / first / run / batch +
 * `.results` + `.meta.changes`), 不追平 D1 全 API. CF 直接返回 `c.env.DB` (D1Database
 * 结构上是 `Db` 超集). 迁移日加 libSQL adapter 实现 `Db`, 把 D1 fluent 翻成
 * `@libsql/client` 的 execute/batch, route 代码不改.
 *
 * batch 原子性 (sync.ts /batch) 与 D1 的等价, 迁移日加 rollback 测试坐实 (见 plan §0.2).
 */

export interface DbMeta {
  changes: number
}

export interface DbResult<T = Record<string, unknown>> {
  results: T[]
  meta: DbMeta
}

export interface DbPreparedStatement {
  bind(...values: unknown[]): DbPreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<DbResult<T>>
  run<T = Record<string, unknown>>(): Promise<DbResult<T>>
}

export interface Db {
  prepare(query: string): DbPreparedStatement
  batch<T = Record<string, unknown>>(statements: DbPreparedStatement[]): Promise<DbResult<T>[]>
}

export function getDb(c: { env: { DB: D1Database } }): Db {
  return c.env.DB
}
