/**
 * SPA 子路径前缀 (例如 `/autotest`). 由 web 包启动时通过 `setProxyBasePath` 注入,
 * 与 vite `base` / gateway 路由前缀锁步.
 * core 是独立 lib build, 无法直接读 `import.meta.env.BASE_URL` (会被替换成 core 自身的 '/').
 */
let configuredBasePath = ''

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
