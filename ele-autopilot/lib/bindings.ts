import { AsyncLocalStorage } from 'node:async_hooks';

import type { Db } from './db/connection';
import type { ObjectStore } from './object-store';

// server.ts 启动时建一次 DB client + 截图 store, 每个请求 runWithBindings 注入;
// loader/action 经 getDb() / getScreenshotStore() 取用. 发布产物 (wheel) 由镜像构建期
//打进 /app/releases, releases.$.tsx 直接读 FS.
export type AppBindings = {
  DB: Db;
  SCREENSHOTS: ObjectStore;
};

// server.ts 从源码 import 本模块, 而 RR 构建把本模块打进 build/server/index.js (bundle 自带
// 一份副本). 两副本各自 `new AsyncLocalStorage()` 会导致 server.ts 存 store、bundle 内 loader
// 取不到. 用全局符号注册表让两副本共享同一 ALS 实例.
const ALS_KEY = Symbol.for('ele-autopilot.bindings.als');
const globalRef = globalThis as unknown as Record<
  symbol,
  AsyncLocalStorage<AppBindings> | undefined
>;
const storage: AsyncLocalStorage<AppBindings> =
  globalRef[ALS_KEY] ?? (globalRef[ALS_KEY] = new AsyncLocalStorage<AppBindings>());

export function runWithBindings<T>(
  bindings: AppBindings,
  fn: () => Promise<T> | T,
): Promise<T> | T {
  return storage.run(bindings, fn);
}

export function getBindings(): AppBindings {
  const bindings = storage.getStore();
  if (!bindings) {
    throw new Error('bindings not available; call runWithBindings() in server entry');
  }
  return bindings;
}
