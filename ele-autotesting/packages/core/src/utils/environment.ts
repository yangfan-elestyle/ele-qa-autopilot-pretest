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

  return `${origin}/${proxyEndpoint}?targetUrl=${encodeURIComponent(normalizedBaseURL)}`
}
