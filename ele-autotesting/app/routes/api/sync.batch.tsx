import { resolveOwner, jsonResponse } from "~/server/auth";
import type { Route } from "./+types/sync.batch";

const MAX_KEY_LEN = 256;
const MAX_VALUE_BYTES = 900 * 1024;
const VALUE_BYTE_COUNTER = new TextEncoder();

function validateKey(key: string): string | null {
  if (!key) return "key required";
  if (key.length > MAX_KEY_LEN) return `key too long (max ${MAX_KEY_LEN})`;
  if (/[\x00-\x1f\x7f]/.test(key)) return "key contains control chars";
  return null;
}

function validateValue(value: unknown): string | null {
  if (typeof value !== "string") return "value must be string";
  const bytes = VALUE_BYTE_COUNTER.encode(value).byteLength;
  if (bytes > MAX_VALUE_BYTES) return `value too large (${bytes} bytes, max ${MAX_VALUE_BYTES})`;
  return null;
}

interface BatchOp {
  key: string;
  op: "set" | "remove";
  value?: unknown;
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);
  const ownerId = resolveOwner(request);
  const env = context.cloudflare.env;

  let body: { ops?: unknown };
  try { body = await request.json(); } catch { return jsonResponse({ error: "invalid json body" }, 400); }

  if (!Array.isArray(body.ops)) return jsonResponse({ error: "ops must be array" }, 400);
  const ops = body.ops as BatchOp[];
  if (ops.length === 0) return jsonResponse({ ok: true, count: 0 });
  if (ops.length > 500) return jsonResponse({ error: "too many ops (max 500)" }, 400);

  const stmts: D1PreparedStatement[] = [];
  const now = Date.now();
  for (const op of ops) {
    const keyErr = validateKey(op.key);
    if (keyErr) return jsonResponse({ error: `op[${op.key}]: ${keyErr}` }, 400);
    if (op.op === "set") {
      const valueErr = validateValue(op.value);
      if (valueErr) return jsonResponse({ error: `op[${op.key}]: ${valueErr}` }, 400);
      stmts.push(
        env.DB.prepare(
          "INSERT INTO storage (owner_id, key, value, updated_at) VALUES (?, ?, ?, ?) " +
            "ON CONFLICT(owner_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        ).bind(ownerId, op.key, op.value as string, now),
      );
    } else if (op.op === "remove") {
      stmts.push(
        env.DB.prepare("DELETE FROM storage WHERE owner_id = ? AND key = ?").bind(ownerId, op.key),
      );
    } else {
      return jsonResponse({ error: `op[${op.key}]: unknown op ${op.op}` }, 400);
    }
  }

  try {
    await env.DB.batch(stmts);
    return jsonResponse({ ok: true, count: ops.length });
  } catch (e: any) {
    console.error("sync batch error:", e?.message || e);
    return jsonResponse({ error: "storage batch failed" }, 500);
  }
}
