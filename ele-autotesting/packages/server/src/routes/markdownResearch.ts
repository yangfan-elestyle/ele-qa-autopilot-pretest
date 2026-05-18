import { Hono, Context } from 'hono'
import { runPlugins } from '../plugins/types.ts'
import { markdownImageResearchPlugin } from '../plugins/markdownImageResearchPlugin.ts'
import type { HonoEnv } from '../types/env.ts'

const router = new Hono<HonoEnv>()

router.post('/', async (c: Context<HonoEnv>) => {
  const body = await c.req.json().catch(() => ({}))

  const markdown = typeof body?.markdown === 'string' ? body.markdown : ''
  if (!markdown) {
    return c.json({ error: 'Missing markdown' }, 400)
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
