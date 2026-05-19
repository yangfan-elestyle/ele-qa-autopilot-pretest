import { loadServerConfig } from "~/server/config/env";
import { runPlugins } from "~/server/plugins/types";
import { markdownImageResearchPlugin } from "~/server/plugins/markdownImageResearchPlugin";
import type { Route } from "./+types/markdown-research";

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }
  const body = await request.json().catch(() => ({}));
  const markdown = typeof (body as any)?.markdown === "string" ? (body as any).markdown : "";
  if (!markdown) {
    return Response.json({ error: "Missing markdown" }, { status: 400 });
  }
  const config = loadServerConfig(context.cloudflare.env);
  const isConfluence = Boolean((body as any)?.isConfluence);
  const imageAuthorization = isConfluence ? config.confluence.authorization || undefined : undefined;
  const plugins = [new markdownImageResearchPlugin({ config, imageAuthorization })];
  const result = await runPlugins({ text: markdown }, plugins);
  return Response.json({ text: result.text, errors: result.errors });
}
