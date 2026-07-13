import { Hono, Context } from 'hono'
import type { HonoEnv } from '../types/env.ts'

interface ConfluencePageResponse {
  id: string
  title?: string
  spaceId?: string
  body?: {
    view?: {
      value: string
    }
  }
}

const router = new Hono<HonoEnv>()

// 上游 (Atlassian Cloud) 调用超时. 显式 AbortSignal 提前止血, 命中后返回 504,
// 避免慢上游长时间占住连接.
const CONFLUENCE_FETCH_TIMEOUT_MS = 25_000

router.get('/', async (c: Context<HonoEnv>) => {
  const pageId = c.req.query('page_id')
  if (!pageId) return c.json({ error: 'Missing page_id parameter' }, 400)

  const { confluence } = c.get('config')
  if (!confluence.token) return c.json({ error: 'QA_ALTASSIAN_API_KEY is not configured' }, 500)
  if (!confluence.email) return c.json({ error: 'QA_ALTASSIAN_EMAIL is not configured' }, 500)

  const headers = {
    Authorization: confluence.authorization,
    'Content-Type': 'application/json',
  }

  const apiUrl = `https://elestyle.atlassian.net/wiki/api/v2/pages/${pageId}?body-format=view`

  try {
    const response = await fetch(apiUrl, {
      headers,
      signal: AbortSignal.timeout(CONFLUENCE_FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      // 上游响应体可能含 Atlassian 内部错误堆栈 / token hint, 仅记到服务端日志,
      // 不回写给客户端; 客户端只看到 status code, 便于运维查 log 而不泄露细节.
      const errorText = await response.text()
      console.error(
        `HTTP error fetching Confluence page ${pageId}: ${response.status} ${errorText.slice(0, 2000)}`,
      )
      return c.json(
        {
          error: `Failed to fetch Confluence page: HTTP ${response.status}`,
        },
        400,
      )
    }

    const data = (await response.json()) as ConfluencePageResponse
    const htmlContent = data.body?.view?.value

    if (!htmlContent) {
      return c.json(
        {
          error: 'Unable to extract HTML content from Confluence API response',
          details: 'Response does not contain expected body.view.value structure',
        },
        400,
      )
    }

    return c.json(
      {
        success: true,
        message: 'Confluence page fetched successfully',
        data: {
          html_content: htmlContent,
          page_id: pageId,
          html_content_length: htmlContent.length,
          title: data.title || '',
          space: data.spaceId || '',
        },
      },
      200,
    )
  } catch (error: any) {
    const isTimeout = error?.name === 'TimeoutError' || error?.name === 'AbortError'
    console.error(`Error fetching Confluence page ${pageId}:`, error?.message || error)
    return c.json(
      {
        error: isTimeout ? 'Confluence request timed out' : 'Failed to fetch Confluence page',
      },
      isTimeout ? 504 : 500,
    )
  }
})

export default router
