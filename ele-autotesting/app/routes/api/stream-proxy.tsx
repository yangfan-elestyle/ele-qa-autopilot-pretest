import type { Route } from "./+types/stream-proxy";

const HOP_HEADERS = new Set(["host", "connection", "content-length", "accept-encoding"]);
const RESP_DROP_HEADERS = new Set(["content-encoding", "transfer-encoding", "content-length"]);

async function proxy(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("targetUrl");
  if (!targetUrl) return Response.json({ error: "缺少目标URL参数" }, { status: 400 });

  let validTargetUrl: string;
  try {
    validTargetUrl = new URL(decodeURIComponent(targetUrl)).toString();
  } catch (error: any) {
    return Response.json({ error: `无效的目标URL: ${error.message}` }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (!HOP_HEADERS.has(key.toLowerCase())) headers[key] = value;
  });
  headers["Accept-Encoding"] = "gzip, deflate, br";

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try { body = JSON.stringify(await request.clone().json()); }
    catch { body = await request.clone().text(); }
  }

  let fetchResponse: Response;
  try {
    fetchResponse = await fetch(validTargetUrl, { method: request.method, headers, body });
  } catch (error: any) {
    console.error("流式代理请求失败:", error?.message || error);
    return Response.json({ error: `流式代理请求失败: ${error?.message || error}` }, { status: 500 });
  }

  const responseHeaders: Record<string, string> = {};
  fetchResponse.headers.forEach((value, key) => {
    if (!RESP_DROP_HEADERS.has(key.toLowerCase())) responseHeaders[key] = value;
  });

  const contentType = fetchResponse.headers.get("content-type") || "";
  const isEventStream = contentType.includes("text/event-stream");

  if (isEventStream) {
    responseHeaders["Content-Type"] = "text/event-stream";
    responseHeaders["Cache-Control"] = "no-cache";
    responseHeaders["Connection"] = "keep-alive";
    responseHeaders["X-Accel-Buffering"] = "no";
  }

  return new Response(fetchResponse.body, {
    status: fetchResponse.status,
    headers: responseHeaders,
  });
}

export async function loader({ request }: Route.LoaderArgs) { return proxy(request); }
export async function action({ request }: Route.ActionArgs) { return proxy(request); }
