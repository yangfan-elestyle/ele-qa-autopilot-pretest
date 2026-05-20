/**
 * 共享代理 URL 校验与响应头过滤。
 *
 * 历史上 /http-proxy 与 /stream-proxy 直接 fetch 用户给的 targetUrl, 等于把
 * Worker 暴露成开放 SSRF 跳板:
 *   - 探测内网 / 云元数据 (169.254.169.254, 127.0.0.1, 10/172/192 段)
 *   - 跳到非 http(s) scheme
 *   - 把上游 set-cookie / authorization 等敏感头转回客户端 (cookie 注入 / 凭据回灌)
 *
 * 这里只做字符串级 host 校验, 拦不住 DNS rebind, 但能挡 99% 的探测请求,
 * 配合 CF Worker 平台层对内网 IP 的拒绝, 风险可控.
 */

const BLOCKED_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^localhost\./i,
  /\.localhost$/i,
  // IPv4 私网 / 环回 / 链路本地 / metadata
  /^127(?:\.\d{1,3}){3}$/,
  /^10(?:\.\d{1,3}){3}$/,
  /^192\.168(?:\.\d{1,3}){2}$/,
  /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/,
  /^169\.254(?:\.\d{1,3}){2}$/,
  /^0(?:\.\d{1,3}){3}$/,
  // IPv6 环回 / unique-local / link-local / mapped
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /^\[?fe80:/i,
  /^\[?::ffff:/i,
  // 部分云供应商 metadata 内部域名
  /\.internal$/i,
  /\.local$/i,
  /metadata\.google\.internal$/i,
]

export type ProxyUrlError = { error: string; status: 400 }

/**
 * 校验目标 URL 是否允许 fetch.
 * 成功返回标准化后的字符串; 失败返回 {error, status:400}.
 */
export function validateProxyTarget(raw: string): { url: string } | ProxyUrlError {
  let parsed: URL
  try {
    parsed = new URL(decodeURIComponent(raw))
  } catch (err: any) {
    return { error: `无效的目标URL: ${err?.message || err}`, status: 400 }
  }

  const proto = parsed.protocol.toLowerCase()
  if (proto !== 'http:' && proto !== 'https:') {
    return { error: `不允许的协议: ${parsed.protocol}`, status: 400 }
  }

  // hostname 在 IPv6 时会带 [ ], URL 解析后会去掉, 这里二次防御
  const host = parsed.hostname.replace(/^\[|\]$/g, '')
  if (!host) return { error: '目标URL缺少 host', status: 400 }
  for (const pat of BLOCKED_HOST_PATTERNS) {
    if (pat.test(host)) {
      return { error: `禁止访问的目标 host: ${host}`, status: 400 }
    }
  }

  return { url: parsed.toString() }
}

/**
 * 上游响应头中需要剥离的敏感字段.
 * - set-cookie / set-cookie2: 防止上游 cookie 注入到 gateway domain 的浏览器
 * - authorization / proxy-authenticate / www-authenticate: 凭据 / 认证挑战回流
 * - content-encoding / transfer-encoding / content-length: Worker 重写 body 时由 fetch 重算
 */
const STRIPPED_RESPONSE_HEADERS = new Set([
  'set-cookie',
  'set-cookie2',
  'authorization',
  'proxy-authenticate',
  'www-authenticate',
  'content-encoding',
  'transfer-encoding',
  'content-length',
])

export function shouldStripResponseHeader(name: string): boolean {
  return STRIPPED_RESPONSE_HEADERS.has(name.toLowerCase())
}
