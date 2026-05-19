import { resolveOwner, jsonResponse } from "~/server/auth";
import type { Route } from "./+types/sync.items";

export async function loader({ request, context }: Route.LoaderArgs) {
  const ownerId = resolveOwner(request);
  const env = context.cloudflare.env;
  try {
    const { results } = await env.DB.prepare(
      "SELECT key, value FROM storage WHERE owner_id = ?",
    )
      .bind(ownerId)
      .all<{ key: string; value: string }>();

    const entries: Record<string, string> = {};
    for (const row of results ?? []) entries[row.key] = row.value;
    return jsonResponse({ entries });
  } catch (e: any) {
    console.error("sync list error:", e?.message || e);
    return jsonResponse({ error: "storage read failed" }, 500);
  }
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "DELETE") return jsonResponse({ error: "method not allowed" }, 405);
  const ownerId = resolveOwner(request);
  const env = context.cloudflare.env;
  try {
    await env.DB.prepare("DELETE FROM storage WHERE owner_id = ?").bind(ownerId).run();
    return jsonResponse({ ok: true });
  } catch (e: any) {
    console.error("sync clear error:", e?.message || e);
    return jsonResponse({ error: "storage clear failed" }, 500);
  }
}
