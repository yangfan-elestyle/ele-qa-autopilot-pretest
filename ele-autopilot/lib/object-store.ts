import { mkdir, readdir, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, sep } from 'node:path';

import { getBindings } from './bindings';

/**
 * 对象存储 seam (文件系统实现).
 *
 * 内网单机 docker-compose 部署, 截图是可再生的任务产物, 落到 autopilot 持久卷
 * (`/data/screenshots`). seam 保留 put / get / list / delete, 若将来 autopilot
 * 需多副本水平扩展, 换 S3 store 时 lib/screenshots.ts 与 screenshots.$.tsx 不动.
 * 发布产物 wheel 不走这里, 镜像构建期打进 /app/releases.
 */

export interface StoredObject {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  httpEtag: string;
}

export interface ObjectListItem {
  key: string;
}

export interface ObjectList {
  objects: ObjectListItem[];
  truncated: boolean;
  cursor?: string;
}

export interface PutOptions {
  httpMetadata?: { contentType?: string };
}

export interface ListOptions {
  prefix?: string;
  cursor?: string;
  limit?: number;
}

export interface ObjectStore {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string,
    options?: PutOptions,
  ): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  list(options?: ListOptions): Promise<ObjectList>;
  delete(keys: string | string[]): Promise<void>;
}

function toWritable(
  value: ReadableStream | ArrayBuffer | ArrayBufferView | string,
): Uint8Array | string {
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  // 本仓无调用方传 ReadableStream 到 put; 不支持路径直接抛错以免静默写空对象.
  throw new Error('ObjectStore.put: ReadableStream body 暂不支持');
}

function isEnoent(err: unknown): boolean {
  return (err as NodeJS.ErrnoException)?.code === 'ENOENT';
}

/**
 * key -> 绝对路径, 并做越界围栏. S3 把 `../` 当字面量, 文件系统不会 —— 写侧
 * (writeScreenshotToR2 的 jobTaskId) 未清洗, 这里用与 server.ts serveStatic 同款
 * `normalize + startsWith(base+sep)` 守住, 越界 key 直接抛错 (由 externalizeScreenshots
 * 逐张 try-catch 兜住, 单张置 null 不打断整条 callback).
 */
function resolveKey(base: string, key: string): string {
  const full = normalize(join(base, key));
  if (full !== base && !full.startsWith(base + sep)) {
    throw new Error(`ObjectStore: 非法 key 越界: ${JSON.stringify(key)}`);
  }
  return full;
}

export function createFsStore(root: string): ObjectStore {
  const base = normalize(root);

  return {
    async put(key, value, _options) {
      const full = resolveKey(base, key);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, toWritable(value));
    },

    async get(key) {
      const full = resolveKey(base, key);
      let st;
      try {
        st = await stat(full);
      } catch (err) {
        if (isEnoent(err)) return null;
        throw err;
      }
      if (!st.isFile()) return null;
      // 全部为 png; contentType 固定, screenshots.$.tsx 也默认 image/png.
      return {
        body: Bun.file(full).stream(),
        httpMetadata: { contentType: 'image/png' },
        httpEtag: `W/"${st.size}-${Math.trunc(st.mtimeMs)}"`,
      };
    },

    // 仅 deleteScreenshotsByJobTaskIds 调用, prefix 恒为 "<jobTaskId>/" (对应一层目录,
    // 内部截图文件平铺 <i>.png). readdir 即可; 单机量小, 无需 cursor/分页.
    async list(options) {
      const prefix = options?.prefix ?? '';
      const dir = resolveKey(base, prefix);
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch (err) {
        if (isEnoent(err)) return { objects: [], truncated: false };
        throw err;
      }
      const norm = prefix === '' || prefix.endsWith('/') ? prefix : `${prefix}/`;
      const objects = entries
        .filter((e) => e.isFile())
        .map((e) => ({ key: `${norm}${e.name}` }));
      return { objects, truncated: false };
    },

    async delete(keys) {
      const list = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
      if (list.length === 0) return;
      const dirs = new Set<string>();
      await Promise.all(
        list.map(async (key) => {
          const full = resolveKey(base, key);
          dirs.add(dirname(full));
          await rm(full, { force: true });
        }),
      );
      // 删空后清掉 <jobTaskId>/ 空目录 (非空/不存在忽略); 不动 base 本身.
      await Promise.all(
        [...dirs].map((d) => (d === base ? null : rmdir(d).catch(() => {}))),
      );
    },
  };
}

export function getScreenshotStore(): ObjectStore {
  return getBindings().SCREENSHOTS;
}
