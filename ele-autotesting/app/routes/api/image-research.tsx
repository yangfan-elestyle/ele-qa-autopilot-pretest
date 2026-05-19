import { loadServerConfig } from "~/server/config/env";
import { analyzeImage } from "~/server/services/imageResearchService";
import type { Route } from "./+types/image-research";

function normalizeErrorStatus(status: unknown, fallback = 500): number {
  if (typeof status !== "number") return fallback;
  if (status < 200 || status > 599) return fallback;
  if (status === 204 || status === 205 || status === 304) return fallback;
  return status;
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const providerInput = body?.provider ? String(body.provider).toLowerCase() : "gemini";
  const provider: "openai" | "gemini" = providerInput === "openai" ? "openai" : "gemini";
  const prompt = String(body?.prompt || "").trim();
  const imageBase64 = (body?.imageBase64 || body?.image || body?.image_base64) as string;
  const mime = (body?.mime || body?.contentType || "image/png") as string;

  if (!imageBase64) {
    return Response.json({ error: "Missing imageBase64" }, { status: 400 });
  }

  try {
    const result = await analyzeImage({
      config: loadServerConfig(context.cloudflare.env),
      provider,
      prompt,
      imageBase64,
      mime,
    });
    return Response.json(result);
  } catch (err: any) {
    const status = normalizeErrorStatus(err?.status);
    return Response.json({ error: err?.message || "Image analysis failed" }, { status });
  }
}
