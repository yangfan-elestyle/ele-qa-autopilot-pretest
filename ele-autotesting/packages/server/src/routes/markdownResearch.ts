import { Hono, Context } from 'hono'
import { runPlugins } from '../plugins/types.ts'
import { markdownImageResearchPlugin } from '../plugins/markdownImageResearchPlugin.ts'
import type { HonoEnv } from '../types/env.ts'

const router = new Hono<HonoEnv>()

// c.req.json() 会把整个 body 读到内存. 没有 size guard 时, 攻击者上传巨型
// markdown (例如 50MB+) 直接把进程拉到 OOM, 业务挂掉.
// 2MB 文本对实际文档 (Confluence 单页, 设计稿导出 md)
// 足够覆盖; content-length 是预检, body 实际长度按字符串再校一次兜底.
const MAX_MARKDOWN_LENGTH = 2 * 1024 * 1024
const MAX_BODY_BYTES = 4 * 1024 * 1024

router.post('/', async (c: Context<HonoEnv>) => {
  const contentLength = c.req.header('content-length')
  if (contentLength) {
    const declared = Number(contentLength)
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return c.json({ error: 'Payload too large', limit_bytes: MAX_BODY_BYTES }, 413)
    }
  }

  const body = await c.req.json().catch(() => ({}))

  const markdown = typeof body?.markdown === 'string' ? body.markdown : ''
  if (!markdown) {
    return c.json({ error: 'Missing markdown' }, 400)
  }
  if (markdown.length > MAX_MARKDOWN_LENGTH) {
    return c.json(
      { error: 'Markdown too large', limit_chars: MAX_MARKDOWN_LENGTH },
      413,
    )
  }

  const config = c.get('config')
  const isConfluence = Boolean(body?.isConfluence)
  const imageAuthorization = isConfluence ? config.confluence.authorization || undefined : undefined
  const plugins = [new markdownImageResearchPlugin({ config, imageAuthorization })]
  const result = await runPlugins({ text: markdown }, plugins)

  return c.json({
    text: result.text,
    errors: result.errors,
  })
})

export default router
