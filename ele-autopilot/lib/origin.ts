// 派生对外入口 origin. autopilot 经 gateway 内网转发 (host 变 autopilot:8080), 故不能直接用
// request.url.origin — gateway 转发时带 X-Forwarded-Host / X-Forwarded-Proto 传真实对外地址.
// install.sh 的 BASE / 任何回给客户端的绝对 URL 必须用它, 否则会烧进内网地址.
export function externalOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host');
  if (host) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'http';
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}
