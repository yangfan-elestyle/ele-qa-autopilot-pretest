import { downloadFile, type DownloadFileOptions } from './fileDownload'

export interface DownloadImageResult {
  base64: string
  mime: string
}

export async function downloadImageToBase64(url: string, options: DownloadFileOptions = {}): Promise<DownloadImageResult> {
  const res = await downloadFile(url, options)
  return { base64: res.base64, mime: res.mime }
}
