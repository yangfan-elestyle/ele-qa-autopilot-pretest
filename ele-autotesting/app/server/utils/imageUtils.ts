export function toDataUrl(imageBase64: string, mime: string = 'image/png'): string | null {
  if (!imageBase64) return null
  const trimmed = String(imageBase64).trim()
  if (trimmed.startsWith('data:')) return trimmed
  return `data:${mime};base64,${trimmed}`
}
