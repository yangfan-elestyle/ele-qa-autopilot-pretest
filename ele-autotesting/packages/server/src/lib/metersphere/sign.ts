/**
 * MeterSphere v3 AK/SK 签名.
 *
 * MS 不是标准 HMAC — 而是把 `${AK}|${uuid}|${nowMs}` 用 AES-CBC 加密后 Base64,
 * 以 (accessKey, signature) header 发出. 服务端用 SK 解密验证 timestamp 在 ±30min 窗口内.
 *
 * 参数约束 (来自 metersphere/metersphere 源码 ApiKeyHandler.java + CodingUtils.aesEncrypt):
 *   - 算法: AES/CBC/PKCS7Padding (WebCrypto 的 AES-CBC 默认 PKCS#7)
 *   - Key:  utf8(SK), 长度 16 / 24 / 32 (AES-128 / 192 / 256)
 *   - IV:   utf8(AK), 长度必须 16
 *
 * 本期 .env 里 AK/SK 都是 16B, 走 AES-128. 如果未来 MS 实例发出 24/32B SK,
 * 长度自适应仍走得通 (importKey 不挑长度), 但 AK 必须是 16B, 否则抛错.
 */

export interface MsSignedHeaders {
  accessKey: string
  signature: string
}

const enc = new TextEncoder()

export async function buildMsSignedHeaders(
  accessKey: string,
  secretKey: string,
): Promise<MsSignedHeaders> {
  const ak = accessKey.trim()
  const sk = secretKey.trim()
  if (!ak || !sk) throw new Error('metersphere: ak/sk required')

  const ivBytes = enc.encode(ak)
  if (ivBytes.byteLength !== 16) {
    throw new Error(`metersphere: AK must be 16 bytes for AES-CBC IV (got ${ivBytes.byteLength})`)
  }
  const keyBytes = enc.encode(sk)
  if (keyBytes.byteLength !== 16 && keyBytes.byteLength !== 24 && keyBytes.byteLength !== 32) {
    throw new Error(
      `metersphere: SK must be 16/24/32 bytes for AES-128/192/256 (got ${keyBytes.byteLength})`,
    )
  }

  const signString = `${ak}|${crypto.randomUUID()}|${Date.now()}`
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['encrypt'],
  )
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: ivBytes },
    cryptoKey,
    enc.encode(signString),
  )

  return { accessKey: ak, signature: base64FromBytes(new Uint8Array(cipher)) }
}

function base64FromBytes(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}
