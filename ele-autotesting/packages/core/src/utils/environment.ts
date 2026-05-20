/**
 * SPA 子路径前缀 (例如 `/autotest`). 由 web 包启动时通过 `setProxyBasePath` 注入,
 * 与 vite `base` / gateway 路由前缀锁步.
 * core 是独立 lib build, 无法直接读 `import.meta.env.BASE_URL` (会被替换成 core 自身的 '/').
 */
let configuredBasePath = ''

/**
 * 业务 API 鉴权头. 经 gateway 时由 Cloudflare Access 在边缘注入 `cf-access-jwt-assertion`,
 * 后端 `resolveOwner` 自行校验; 浏览器侧通常不需要业务头, 保留 setAuthHeaders/getAuthHeaders
 * 接口仅供未来扩展 (如附加 Authorization Bearer 等场景) 或测试期注入.
 * LLM proxy (`/stream-proxy` / `/http-proxy`) 由 LLM SDK 内部 fetch 发起, 不参与注入,
 * 安全靠 `proxyGuard` SSRF 黑名单兜底.
 */
let configuredAuthHeaders: Record<string, string> = {}

/**
 * 由宿主 (web) 在初始化早期调用, 告知 core 当前 SPA 挂载的子路径前缀.
 * 影响 `getProxyUrl` 的返回值: 后续走 `${origin}${basePath}/{stream,http}-proxy?...`,
 * 命中 gateway 的 `/autotest/*` 路由后剥前缀转 AUTOTEST.
 */
export const setProxyBasePath = (basePath: string): void => {
  configuredBasePath = basePath.replace(/\/+$/, '')
}

/**
 * 读取已配置的 SPA 子路径前缀. UI 组件直接 `fetch('/foo')` 会丢前缀, 经 gateway
 * 错路由到 AUTOPILOT, 需改成 `${getApiBasePath()}/foo`.
 */
export const getApiBasePath = (): string => configuredBasePath

/**
 * 注册业务 API 鉴权头 (默认空). 经 gateway 时身份由 CF Access 边缘注入,
 * 此接口仅用于将来扩展或 dev 临时附加自定义头.
 */
export const setAuthHeaders = (headers: Record<string, string>): void => {
  configuredAuthHeaders = { ...headers }
}

/** 读取当前注册的业务 API 鉴权头. 未注册时返回空对象, 调用方可安全 spread. */
export const getAuthHeaders = (): Record<string, string> => ({ ...configuredAuthHeaders })

/**
 * 获取API代理URL
 * @param baseURL 原始基础URL
 * @param isStream 是否是流式请求
 */
export const getProxyUrl = (baseURL: string | undefined, isStream: boolean = false): string => {
  if (!baseURL) {
    return ''
  }

  const normalizedBaseURL = baseURL.replace(/\/+$/, '')
  const origin = window.location.origin
  const proxyEndpoint = isStream ? 'stream-proxy' : 'http-proxy'

  return `${origin}${configuredBasePath}/${proxyEndpoint}?targetUrl=${encodeURIComponent(normalizedBaseURL)}`
}
