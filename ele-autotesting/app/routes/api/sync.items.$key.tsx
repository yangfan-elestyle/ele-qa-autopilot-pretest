import { resolveOwner, jsonResponse } from "~/server/auth";
import type { Route } from "./+types/sync.items.$key";

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

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const ownerId = resolveOwner(request);
  const key = params.key as string;
  const keyErr = validateKey(key);
  if (keyErr) return jsonResponse({ error: keyErr }, 400);

  try {
    const row = await context.cloudflare.env.DB.prepare(
      "SELECT value FROM storage WHERE owner_id = ? AND key = ?",
    )
      .bind(ownerId, key)
      .first<{ value: string }>();
    return jsonResponse({ value: row?.value ?? null });
  } catch (e: any) {
    console.error("sync get error:", e?.message || e);
    return jsonResponse({ error: "storage read failed" }, 500);
  }
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const ownerId = resolveOwner(request);
  const key = params.key as string;
  const keyErr = validateKey(key);
  if (keyErr) return jsonResponse({ error: keyErr }, 400);
  const env = context.cloudflare.env;

  if (request.method === "PUT") {
    let body: { value?: unknown };
    try { body = await request.json(); } catch { return jsonResponse({ error: "invalid json body" }, 400); }
    const valueErr = validateValue(body.value);
    if (valueErr) return jsonResponse({ error: valueErr }, 400);
    try {
      await env.DB.prepare(
        "INSERT INTO storage (owner_id, key, value, updated_at) VALUES (?, ?, ?, ?) " +
          "ON CONFLICT(owner_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      )
        .bind(ownerId, key, body.value as string, Date.now())
        .run();
      return jsonResponse({ ok: true });
    } catch (e: any) {
      console.error("sync put error:", e?.message || e);
      return jsonResponse({ error: "storage write failed" }, 500);
    }
  }

  if (request.method === "DELETE") {
    try {
      await env.DB.prepare("DELETE FROM storage WHERE owner_id = ? AND key = ?").bind(ownerId, key).run();
      return jsonResponse({ ok: true });
    } catch (e: any) {
      console.error("sync delete error:", e?.message || e);
      return jsonResponse({ error: "storage delete failed" }, 500);
    }
  }

  return jsonResponse({ error: "method not allowed" }, 405);
}
