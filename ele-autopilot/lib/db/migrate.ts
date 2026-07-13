import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { Client } from '@libsql/client';

// 迁移 (Phase B): D1 靠 `wrangler d1 migrations apply`, libSQL 自建 runner.
// 顺序执行 migrations/*.sql (纯 SQLite 方言), 已执行的记进 _migrations 表, 幂等.
// server.ts boot 时调用一次. executeMultiple 整文件执行 (不手 split `;`).

const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations/', import.meta.url));

export async function runMigrations(client: Client): Promise<void> {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`,
  );
  const applied = new Set<string>();
  const rs = await client.execute('SELECT name FROM _migrations');
  for (const row of rs.rows) applied.add(String(row.name));

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    await client.executeMultiple(sql);
    await client.execute({
      sql: 'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)',
      args: [file, new Date().toISOString()],
    });
    console.log(`[autopilot] migration applied: ${file}`);
  }
}
