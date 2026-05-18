// MCP 浏览器直连客户端 (Streamable HTTP)
//
// 前端直接走 MCP Streamable HTTP 协议与同源 Worker 反代的 MCP 服务器通信，
// 不再依赖任何后端 mcp-proxy session 缓存层。
//
// 协议参考: https://spec.modelcontextprotocol.io/specification/basic/transports/

export interface McpServiceConfig {
  /** MCP server URL，建议同源相对路径如 `/mcps/markitdown/mcp` */
  serverUrl: string
  client: {
    name: string
    version: string
  }
}

export interface McpToolCallOptions {
  signal?: AbortSignal
}

export interface McpCallToolResult<TStructured = unknown> {
  content: Array<any>
  structuredContent?: TStructured
  isError?: boolean
}

export interface TextContent {
  type: 'text'
  text: string
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0'
  id?: number | string
  result?: T
  error?: { code: number; message: string; data?: unknown }
}

const PROTOCOL_VERSION = '2025-03-26'

function parseMcpPayload<T>(text: string, contentType: string): JsonRpcResponse<T> | null {
  if (contentType.includes('text/event-stream')) {
    const dataLines = text
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim())
      .filter(Boolean)
    if (dataLines.length === 0) return null
    try {
      return JSON.parse(dataLines[dataLines.length - 1]) as JsonRpcResponse<T>
    } catch {
      return null
    }
  }
  try {
    return JSON.parse(text) as JsonRpcResponse<T>
  } catch {
    return null
  }
}

export class McpService {
  private readonly cfg: McpServiceConfig
  private sessionId?: string
  private rpcId = 0
  private initialized = false
  private initPromise: Promise<void> | null = null

  constructor(cfg: McpServiceConfig) {
    this.cfg = cfg
  }

  private async rpc<T>(method: string, params?: unknown, signal?: AbortSignal, isInit = false): Promise<JsonRpcResponse<T>> {
    const id = ++this.rpcId
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    }
    if (this.sessionId && !isInit) headers['mcp-session-id'] = this.sessionId

    const body = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      ...(params !== undefined ? { params } : {}),
    })

    const resp = await fetch(this.cfg.serverUrl, { method: 'POST', headers, body, signal })

    const newSession = resp.headers.get('mcp-session-id')
    if (newSession) this.sessionId = newSession

    const text = await resp.text()
    if (!resp.ok) {
      throw new Error(`MCP ${method} failed: HTTP ${resp.status} ${text.slice(0, 400)}`)
    }
    const ct = resp.headers.get('content-type') || ''
    const parsed = parseMcpPayload<T>(text, ct)
    if (!parsed) throw new Error(`MCP ${method} response unparseable`)
    if (parsed.error) throw new Error(`MCP ${method} error: ${parsed.error.message}`)
    return parsed
  }

  private async notify(method: string, params?: unknown): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    }
    if (this.sessionId) headers['mcp-session-id'] = this.sessionId

    await fetch(this.cfg.serverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', method, ...(params !== undefined ? { params } : {}) }),
    })
  }

  async connect(): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      await this.rpc('initialize', {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: this.cfg.client,
      }, undefined, true)
      await this.notify('notifications/initialized')
      this.initialized = true
    })().catch((err) => {
      this.initPromise = null
      throw err
    })
    return this.initPromise
  }

  async callTool<TArgs extends Record<string, unknown>, TStructured = unknown>(
    name: string,
    args: TArgs,
    options?: McpToolCallOptions,
  ): Promise<McpCallToolResult<TStructured>> {
    await this.connect()

    const resp = await this.rpc<{ content?: unknown[]; structuredContent?: unknown; isError?: boolean }>(
      'tools/call',
      { name, arguments: args },
      options?.signal,
    )
    const result = resp.result || {}
    const content = Array.isArray(result.content) ? (result.content as any[]) : []
    return {
      content,
      structuredContent: (result.structuredContent ?? undefined) as TStructured | undefined,
      isError: typeof result.isError === 'boolean' ? result.isError : undefined,
    }
  }

  async close(): Promise<void> {
    if (this.sessionId) {
      try {
        await fetch(this.cfg.serverUrl, {
          method: 'DELETE',
          headers: { 'mcp-session-id': this.sessionId },
        })
      } catch {
        // ignore
      }
    }
    this.sessionId = undefined
    this.initialized = false
    this.initPromise = null
  }
}

export function createMcpService(config: McpServiceConfig): McpService {
  return new McpService({
    serverUrl: config.serverUrl,
    client: config.client ?? { name: 'Prompt Optimizer UI', version: '0.0.1' },
  })
}

export function createMcpServiceFor(config: McpServiceConfig): McpService {
  return createMcpService(config)
}

/**
 * Convenience: extract text strings from MCP tool result.
 */
export function getMcpTextContents(res: McpCallToolResult): string[] {
  const content = Array.isArray(res?.content) ? (res.content as any[]) : []
  return content
    .filter((b): b is TextContent => b && typeof b === 'object' && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
}
