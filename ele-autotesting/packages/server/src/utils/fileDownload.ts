export interface DownloadFileOptions {
  authorization?: string
  headers?: Record<string, string>
}

export interface DownloadFileResult {
  bytes: Uint8Array
  base64: string
  mime: string
  size: number
  filename?: string
}

export async function downloadFile(url: string, options: DownloadFileOptions = {}): Promise<DownloadFileResult> {
  const { authorization, headers = {} } = options
  if (!url) throw new Error('Empty url')
  const trimmed = String(url).trim()

  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('Only http(s) URLs are supported')
  }

  const res = await fetch(trimmed, {
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
      ...headers,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to download file: HTTP ${res.status}${text ? ` - ${text}` : ''}`)
  }

  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  const mime = contentType.split(';')[0].trim() || 'application/octet-stream'

  const arr = await res.arrayBuffer()
  const bytes = new Uint8Array(arr)

  const contentDisposition = res.headers.get('content-disposition') || ''
  const filename = parseFilenameFromContentDisposition(contentDisposition)

  return {
    bytes,
    base64: bytesToBase64(bytes),
    mime,
    size: bytes.byteLength,
    filename,
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  // 全局有 btoa；分块处理避免 String.fromCharCode 调用栈溢出
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function parseFilenameFromContentDisposition(disposition: string): string | undefined {
  const starMatch = disposition.match(/filename\*=([^']*)''([^;]+)$/i)
  if (starMatch) {
    try {
      return decodeURIComponent(starMatch[2])
    } catch {
      return starMatch[2]
    }
  }
  const quoted = disposition.match(/filename="([^"]+)"/i)
  if (quoted) return quoted[1]
  const plain = disposition.match(/filename=([^;]+)/i)
  if (plain) return plain[1]
  return undefined
}
