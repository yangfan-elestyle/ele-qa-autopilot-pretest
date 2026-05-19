/**
 * resolveOwner — 把请求映射成一个稳定的 ownerId 字符串。
 *
 * V1 (当前): 从 X-Device-Id 头读 ID, 返回 'device:<id>'.
 *           前端 useAppInitializer 固定写 'shared-owner-v1', 全部浏览器共享同一 owner.
 *
 * V2 (Google 登录上线后): 优先取 Authorization Bearer id_token, 解析后返回 'google:<sub>'.
 *
 * 抛出 Response 表示鉴权失败, 调用方直接 throw response 中断。
 */
export function resolveOwner(request: Request): string {
  const deviceId = request.headers.get("X-Device-Id")?.trim();
  if (!deviceId) {
    throw new Response(
      JSON.stringify({ error: "missing X-Device-Id header" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(deviceId)) {
    throw new Response(
      JSON.stringify({ error: "invalid X-Device-Id format" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  return `device:${deviceId}`;
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
