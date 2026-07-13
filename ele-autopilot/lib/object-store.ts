import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { getBindings } from './bindings';

/**
 * 对象存储 seam (A2 → Phase B MinIO 实现).
 *
 * 抽象出本仓实际用到的 R2 表面 (put / get / list / delete + httpMetadata / httpEtag),
 * `createS3Store()` 用 aws-sdk-v3 打到 MinIO (S3 兼容). screenshots.ts / releases.local
 * 调用不改. 仅覆盖用到的字段, 不追平完整 R2 API.
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

export interface S3Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

// S3 单次 DeleteObjects 上限 1000 keys.
const DELETE_CHUNK = 1000;

function toBody(
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

function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;
}

export function createS3Client(cfg: S3Config): S3Client {
  return new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    forcePathStyle: cfg.forcePathStyle,
  });
}

export function createS3Store(client: S3Client, bucket: string): ObjectStore {
  return {
    async put(key, value, options) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: toBody(value),
          ContentType: options?.httpMetadata?.contentType,
        }),
      );
    },

    async get(key) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!res.Body) return null;
        return {
          body: (res.Body as { transformToWebStream(): ReadableStream }).transformToWebStream(),
          httpMetadata: { contentType: res.ContentType },
          httpEtag: res.ETag ?? '',
        };
      } catch (err) {
        if (isNotFound(err)) return null;
        throw err;
      }
    },

    async list(options) {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: options?.prefix,
          ContinuationToken: options?.cursor,
          MaxKeys: options?.limit,
        }),
      );
      return {
        objects: (res.Contents ?? [])
          .map((o) => o.Key)
          .filter((k): k is string => !!k)
          .map((key) => ({ key })),
        truncated: !!res.IsTruncated,
        cursor: res.NextContinuationToken,
      };
    },

    async delete(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      if (list.length === 0) return;
      for (let i = 0; i < list.length; i += DELETE_CHUNK) {
        const chunk = list.slice(i, i + DELETE_CHUNK);
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
          }),
        );
      }
    },
  };
}

export function getScreenshotStore(): ObjectStore {
  return getBindings().SCREENSHOTS;
}

export function getReleaseStore(): ObjectStore {
  return getBindings().RELEASES;
}
