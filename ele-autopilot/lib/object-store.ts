import { getBindings } from './bindings';

/**
 * 迁移前置 (A2): 对象存储 seam.
 *
 * 抽象出本仓实际用到的 R2 表面 (put / get / list / delete + httpMetadata / httpEtag),
 * CF 实现薄封装 `R2Bucket`. 迁移日加 aws-sdk-v3 → MinIO 实现 (native dep, Phase A 不引入,
 * 否则进 Worker bundle), 只换 wrap 函数, screenshots.ts / releases.local 调用不改.
 *
 * 仅覆盖用到的字段, 不追平完整 R2 API.
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

// CF 实现: 透传到 R2Bucket. R2ObjectBody / R2Objects 结构上是 StoredObject / ObjectList 的超集,
// 直接返回即可 (put 丢弃 R2Object 返回值收敛为 void).
function wrapR2(bucket: R2Bucket): ObjectStore {
  return {
    put: (key, value, options) => bucket.put(key, value, options).then(() => undefined),
    get: (key) => bucket.get(key),
    list: (options) => bucket.list(options),
    delete: (keys) => bucket.delete(keys),
  };
}

export function getScreenshotStore(): ObjectStore {
  return wrapR2(getBindings().SCREENSHOTS);
}

export function getReleaseStore(): ObjectStore {
  return wrapR2(getBindings().RELEASES);
}
