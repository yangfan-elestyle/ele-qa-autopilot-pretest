import type { Client, InArgs, InValue } from '@libsql/client'

/**
 * DB 客户端 seam (A3 → Phase B libSQL 实现).
 *
 * `Db` 只覆盖本仓实际用到的 D1 表面 (prepare / bind / all / first / run / batch +
 * `.results` + `.meta.changes`). `createLibsqlDb()` 把 D1 fluent 翻成 `@libsql/client` 的
 * execute/batch, route 代码不改. batch 原子性 (sync.ts /batch) 用 `batch(stmts, 'write')`
 * (隐式写事务, 任一条失败整批回滚) 坐实.
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

class LibsqlStatement implements DbPreparedStatement {
  constructor(
    private readonly client: Client,
    readonly sql: string,
    readonly args: InArgs = [],
  ) {}

  bind(...values: unknown[]): DbPreparedStatement {
    return new LibsqlStatement(this.client, this.sql, values as InValue[])
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const rs = await this.client.execute({ sql: this.sql, args: this.args })
    return (rs.rows[0] as T | undefined) ?? null
  }

  async all<T = Record<string, unknown>>(): Promise<DbResult<T>> {
    const rs = await this.client.execute({ sql: this.sql, args: this.args })
    return { results: rs.rows as unknown as T[], meta: { changes: Number(rs.rowsAffected) } }
  }

  async run<T = Record<string, unknown>>(): Promise<DbResult<T>> {
    const rs = await this.client.execute({ sql: this.sql, args: this.args })
    return { results: rs.rows as unknown as T[], meta: { changes: Number(rs.rowsAffected) } }
  }
}

export function createLibsqlDb(client: Client): Db {
  return {
    prepare(query: string): DbPreparedStatement {
      return new LibsqlStatement(client, query)
    },
    async batch<T = Record<string, unknown>>(
      statements: DbPreparedStatement[],
    ): Promise<DbResult<T>[]> {
      const stmts = statements.map((s) => {
        const ls = s as LibsqlStatement
        return { sql: ls.sql, args: ls.args }
      })
      const results = await client.batch(stmts, 'write')
      return results.map((rs) => ({
        results: rs.rows as unknown as T[],
        meta: { changes: Number(rs.rowsAffected) },
      }))
    },
  }
}

export function getDb(c: { env: { DB: Db } }): Db {
  return c.env.DB
}
