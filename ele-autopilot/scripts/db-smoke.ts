// DB 冒烟测试: 用真实 migrations + 真实 lib/db 代码坐实 libSQL adapter 的
// batch 原子性 (createJob) + FK CASCADE (jobs→job_tasks). 无外部依赖 (临时 file: DB).
// 回归用: `bun run smoke`.
import { createClient } from '@libsql/client';
import { rmSync } from 'node:fs';

import { runWithBindings } from '../lib/bindings';
import { createLibsqlDb, getDb } from '../lib/db/connection';
import { runMigrations } from '../lib/db/migrate';
import {
  createFolder,
  createTask,
  createJob,
  getJobById,
  getJobTasksByJobId,
  deleteTaskById,
} from '../lib/db';
import type { ObjectStore } from '../lib/object-store';

const DB = '/tmp/autopilot-db-smoke.db';
for (const s of ['', '-wal', '-shm']) {
  try {
    rmSync(DB + s);
  } catch {
    /* not present */
  }
}

let fails = 0;
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) console.log('PASS', name);
  else {
    fails++;
    console.log('FAIL', name, extra);
  }
};

const client = createClient({ url: `file:${DB}` });
await client.execute('PRAGMA foreign_keys=ON');
await runMigrations(client);

const noopStore = {} as ObjectStore;
const bindings = { DB: createLibsqlDb(client), SCREENSHOTS: noopStore };

await runWithBindings(bindings, async () => {
  // 真实链路: folder -> task -> createJob (batch: jobs + job_tasks 原子写)
  const folder = await createFolder({ name: 'smoke' });
  const task = await createTask({ text: 'smoke task', folder_id: folder.id });
  const job = await createJob({ task_id: task.id });
  check('createJob 返回 job', !!job.id);
  check('createJob 写入 job_tasks (batch)', (await getJobTasksByJobId(job.id)).length === 1);

  // FK CASCADE: 删 task -> jobs (task_id CASCADE) -> job_tasks (job_id CASCADE)
  await deleteTaskById(task.id);
  check('删 task 级联删 job', (await getJobById(job.id)) === null);
  check('删 task 级联删 job_tasks', (await getJobTasksByJobId(job.id)).length === 0);

  // batch(write) 回滚: 同一 PK 两次插入, 第二条失败, 整批回滚
  const folder2 = await createFolder({ name: 'smoke2' });
  const task2 = await createTask({ text: 'smoke2', folder_id: folder2.id });
  const db = getDb();
  const dupId = crypto.randomUUID();
  const now = new Date().toISOString();
  let threw = false;
  try {
    await db.batch([
      db
        .prepare('INSERT INTO jobs (id,task_id,status,config,created_at) VALUES (?,?,?,?,?)')
        .bind(dupId, task2.id, 'pending', '{}', now),
      db
        .prepare('INSERT INTO jobs (id,task_id,status,config,created_at) VALUES (?,?,?,?,?)')
        .bind(dupId, task2.id, 'pending', '{}', now),
    ]);
  } catch {
    threw = true;
  }
  check('batch 冲突时抛错', threw);
  check('batch 失败整批回滚', (await getJobById(dupId)) === null);
});

client.close();
for (const s of ['', '-wal', '-shm']) {
  try {
    rmSync(DB + s);
  } catch {
    /* ignore */
  }
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
