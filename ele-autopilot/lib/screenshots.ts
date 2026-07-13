import { getScreenshotStore, type ObjectList } from './object-store';
import type { TaskActionResult } from './db';

const URL_PREFIX = '/screenshots';

// 单张截图 base64 上限. Worker 单实例内存 128MB, 一次 callback 可能携带 N 步
// 截图; 这里收 6MB/张, 解码后原图体积 ~4.5MB, 留出 Worker 处理余量.
// 超限的截图直接丢弃 (字段置空), 不让 base64 字符串落到 R2 — 既能让任务结果
// 仍写回 D1, 又避免被恶意 / 异常 client 撑爆 R2 配额或 Worker 内存.
const MAX_SCREENSHOT_BASE64_LENGTH = 6 * 1024 * 1024;

function stripDataUriPrefix(value: string): string {
  const m = /^data:image\/[a-zA-Z0-9+.-]+;base64,/.exec(value);
  return m ? value.slice(m[0].length) : value;
}

function looksLikePath(value: string): boolean {
  return value.startsWith('/') || /^https?:\/\//.test(value);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function r2KeyFromRelPath(rel: string): string | null {
  if (!rel || rel.includes('\0') || rel.includes('..')) return null;
  const trimmed = rel.replace(/^\/+/, '');
  if (!/^[A-Za-z0-9_./-]+$/.test(trimmed)) return null;
  return trimmed;
}

async function writeScreenshotToR2(
  jobTaskId: string,
  stepIndex: number,
  base64: string,
): Promise<string> {
  const store = getScreenshotStore();
  const key = `${jobTaskId}/${stepIndex}.png`;
  // base64ToBytes 内部 atob() 遇非法字符抛 InvalidCharacterError; store.put
  // 也可能因存储暂态故障抛错. 让异常向上传播给 externalizeScreenshots 的逐张
  // try-catch 捕获 — 单张失败就置 null 不阻断其他截图与 task 状态写入.
  await store.put(key, base64ToBytes(stripDataUriPrefix(base64)), {
    httpMetadata: { contentType: 'image/png' },
  });
  return `${URL_PREFIX}/${key}`;
}

/**
 * 删除一批 job_task 对应的全部截图。
 * R2 没有原生级联, D1 FK CASCADE 只清表行, 截图会留成孤儿对象占用配额.
 * 分批列举 `<jobTaskId>/` 前缀下所有对象后 delete; 单次 list 上限 1000 对象,
 * 通过 cursor 分页吃完整桶. 失败仅 console.warn — 删 D1 数据已先完成,
 * 残留 R2 对象比删除中断更可接受.
 */
export async function deleteScreenshotsByJobTaskIds(jobTaskIds: string[]): Promise<void> {
  if (jobTaskIds.length === 0) return;
  const store = getScreenshotStore();

  for (const id of jobTaskIds) {
    if (!id) continue;
    const prefix = `${id}/`;
    try {
      let cursor: string | undefined = undefined;
      do {
        const listed: ObjectList = await store.list({ prefix, cursor, limit: 1000 });
        const keys = listed.objects.map((o) => o.key);
        if (keys.length > 0) {
          await store.delete(keys);
        }
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);
    } catch (err) {
      console.warn(`[screenshots] cleanup failed for ${prefix}:`, err);
    }
  }
}

/**
 * 把 result.steps[].thinking_image 的 base64 内嵌图片抽出落盘到 R2,
 * 字段值替换为 /screenshots/{id}/{i}.png. 幂等 (已经是路径的不动).
 *
 * 单张截图失败 (base64 解码异常 / R2 暂态故障) 不打断整条 callback —
 * 该字段置 null + console.warn, 其他步骤继续处理. 没有这层隔离时,
 * 一张坏图 → atob() 抛 InvalidCharacterError → callback 整体 500
 * → local agent 重试到上限后整个 task 永远卡在 running.
 */
export async function externalizeScreenshots(
  jobTaskId: string,
  result: TaskActionResult | null,
): Promise<TaskActionResult | null> {
  if (!result || !Array.isArray(result.steps)) return result;

  for (let i = 0; i < result.steps.length; i++) {
    const step = result.steps[i] as { thinking_image?: unknown };
    const img = step.thinking_image;
    if (typeof img !== 'string' || img.length === 0 || img === '<string>') continue;
    if (looksLikePath(img)) continue;
    if (img.length > MAX_SCREENSHOT_BASE64_LENGTH) {
      console.warn(
        `[screenshots] step ${i} of ${jobTaskId} dropped: base64 length ${img.length} > limit ${MAX_SCREENSHOT_BASE64_LENGTH}`,
      );
      step.thinking_image = null;
      continue;
    }
    try {
      step.thinking_image = await writeScreenshotToR2(jobTaskId, i, img);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[screenshots] step ${i} of ${jobTaskId} dropped: write failed: ${message}`,
      );
      step.thinking_image = null;
    }
  }

  return result;
}
