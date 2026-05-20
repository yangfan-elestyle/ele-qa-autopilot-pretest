/**
 * SPA 子路径前缀 (例如 `/autotest`). 由 web 包启动时通过 `setProxyBasePath` 注入,
 * 与 vite `base` / gateway 路由前缀锁步.
 * core 是独立 lib build, 无法直接读 `import.meta.env.BASE_URL` (会被替换成 core 自身的 '/').
 */
let configuredBasePath = ''

/**
 * 业务 API 鉴权头. 由宿主 (web/ui) 在初始化早期通过 `setAuthHeaders` 注入,
 * 现阶段 V1 固定 `X-Device-Id: shared-owner-v1` (与 useAppInitializer 共享同一 owner).
 * UI 组件直接调 `/confluence-parse`、`/figma-parse`、`/image-research/analyze`、
 * `/markdown-research` 等业务路由时必须把这套头带上, 否则后端 resolveOwner 中间件
 * 直接 401. LLM proxy (`/stream-proxy` / `/http-proxy`) 由 LLM SDK 内部 fetch 发起,
 * 这里不参与注入 — 这些路由保持 open 由 `proxyGuard` SSRF 黑名单兜底.
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
 * 注册业务 API 鉴权头. 后续 UI 组件 `fetch(..., { headers: getAuthHeaders() })`
 * 即可同步拿到. V2 切 Google 登录时把这里换成动态返回 `Authorization: Bearer ...` 即可.
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
