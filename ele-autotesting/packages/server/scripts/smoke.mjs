#!/usr/bin/env node
// End-to-end smoke test for the ele-autotesting Worker deployment.
//
//   ENDPOINT  default: http://127.0.0.1:8787
//
// Exits 0 on full PASS, non-zero on any failure.

const ENDPOINT = (process.env.ENDPOINT ?? 'http://127.0.0.1:8787').replace(/\/+$/, '')

const results = []
function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`)
}

async function step(name, fn) {
  try {
    record(name, true, (await fn()) ?? '')
  } catch (err) {
    record(name, false, err?.message || String(err))
  }
}

const json = (r) => r.json()

await step('GET /healthz', async () => {
  const r = await fetch(`${ENDPOINT}/healthz`)
  if (r.status !== 200) throw new Error(`status=${r.status}`)
  const body = await r.text()
  if (body.trim() !== 'ok') throw new Error(`body="${body}"`)
  return '200 ok'
})

await step('GET / (SPA index)', async () => {
  const r = await fetch(`${ENDPOINT}/`)
  if (r.status !== 200) throw new Error(`status=${r.status}`)
  const ct = r.headers.get('content-type') || ''
  if (!ct.includes('text/html')) throw new Error(`content-type="${ct}"`)
  return ct
})

await step('GET /unknown/spa-route (SPA fallback)', async () => {
  const r = await fetch(`${ENDPOINT}/some/spa-path`)
  if (r.status !== 200) throw new Error(`status=${r.status}`)
  const ct = r.headers.get('content-type') || ''
  if (!ct.includes('text/html')) throw new Error(`content-type="${ct}"`)
  return 'served index.html'
})

await step('GET /confluence-parse (validation)', async () => {
  const r = await fetch(`${ENDPOINT}/confluence-parse`)
  if (r.status !== 400) throw new Error(`status=${r.status}`)
  const body = await json(r)
  if (!body?.error?.includes('page_id')) throw new Error(`unexpected error: ${JSON.stringify(body)}`)
  return body.error
})

await step('POST /image-research/analyze (validation)', async () => {
  const r = await fetch(`${ENDPOINT}/image-research/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (r.status !== 400) throw new Error(`status=${r.status}`)
  const body = await json(r)
  if (!body?.error?.includes('imageBase64')) throw new Error(`unexpected: ${JSON.stringify(body)}`)
  return body.error
})

await step('POST /markdown-research (no images passthrough)', async () => {
  const r = await fetch(`${ENDPOINT}/markdown-research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown: '# title\n\nplain content' }),
  })
  if (r.status !== 200) throw new Error(`status=${r.status}`)
  const body = await json(r)
  if (typeof body?.text !== 'string') throw new Error('text missing')
  return `${body.text.length} bytes`
})

await step('POST /figma-parse (validation)', async () => {
  const r = await fetch(`${ENDPOINT}/figma-parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (r.status !== 400) throw new Error(`status=${r.status}`)
  const body = await json(r)
  if (!body?.error?.includes('url')) throw new Error(`unexpected: ${JSON.stringify(body)}`)
  return body.error
})

await step('GET /http-proxy missing param', async () => {
  const r = await fetch(`${ENDPOINT}/http-proxy`)
  if (r.status !== 400) throw new Error(`status=${r.status}`)
  return '400 as expected'
})

await step('GET /stream-proxy missing param', async () => {
  const r = await fetch(`${ENDPOINT}/stream-proxy`)
  if (r.status !== 400) throw new Error(`status=${r.status}`)
  return '400 as expected'
})

await step('GET /unknown-api (404 json)', async () => {
  const r = await fetch(`${ENDPOINT}/this-endpoint-does-not-exist-xyz`, {
    headers: { Accept: 'application/json' },
  })
  // 静态资源 SPA fallback 会接管未知路径并返回 index.html (200, text/html)，
  // 这里通过 Accept: application/json 也无法绕过 (Workers Static Assets 不看 Accept)。
  // 因此 /unknown-api 仍走 SPA fallback，状态码 200 是预期行为。
  if (r.status !== 200) throw new Error(`status=${r.status}`)
  return 'spa fallback (expected)'
})

await step('POST /mcps/markitdown/mcp tools/list', async () => {
  const r = await fetch(`${ENDPOINT}/mcps/markitdown/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  })
  if (!r.ok) throw new Error(`status=${r.status}`)
  const body = await r.text()
  const ct = r.headers.get('content-type') || ''
  const payload = parseMcp(body, ct)
  const tools = payload?.result?.tools
  if (!Array.isArray(tools)) throw new Error(`no tools: ${body.slice(0, 300)}`)
  const names = tools.map((t) => t.name)
  if (!names.includes('convert_to_markdown')) throw new Error(`missing convert_to_markdown: ${names.join(',')}`)
  return `tools=[${names.join(',')}]`
})

// ─── /api/sync (D1) smoke ────────────────────────────────────────────────
const SYNC_DEVICE_ID = `smoke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const SYNC_HEADERS = { 'X-Device-Id': SYNC_DEVICE_ID, 'Content-Type': 'application/json' }
const SYNC_KEY = 'smoke-test-key'

await step('GET /api/sync/items (auth missing → 401)', async () => {
  const r = await fetch(`${ENDPOINT}/api/sync/items`)
  if (r.status !== 401) throw new Error(`status=${r.status}`)
  return '401 as expected'
})

await step('PUT /api/sync/items/:key', async () => {
  const r = await fetch(`${ENDPOINT}/api/sync/items/${SYNC_KEY}`, {
    method: 'PUT',
    headers: SYNC_HEADERS,
    body: JSON.stringify({ value: '{"hello":"world"}' }),
  })
  if (!r.ok) throw new Error(`status=${r.status} ${await r.text()}`)
  return 'ok'
})

await step('GET /api/sync/items/:key', async () => {
  const r = await fetch(`${ENDPOINT}/api/sync/items/${SYNC_KEY}`, { headers: SYNC_HEADERS })
  if (!r.ok) throw new Error(`status=${r.status}`)
  const body = await json(r)
  if (body.value !== '{"hello":"world"}') throw new Error(`got ${JSON.stringify(body)}`)
  return body.value
})

await step('POST /api/sync/batch (set + remove)', async () => {
  const r = await fetch(`${ENDPOINT}/api/sync/batch`, {
    method: 'POST',
    headers: SYNC_HEADERS,
    body: JSON.stringify({
      ops: [
        { key: 'smoke-a', op: 'set', value: 'a' },
        { key: 'smoke-b', op: 'set', value: 'b' },
        { key: SYNC_KEY, op: 'remove' },
      ],
    }),
  })
  if (!r.ok) throw new Error(`status=${r.status} ${await r.text()}`)
  return 'ok'
})

await step('GET /api/sync/items (list after batch)', async () => {
  const r = await fetch(`${ENDPOINT}/api/sync/items`, { headers: SYNC_HEADERS })
  if (!r.ok) throw new Error(`status=${r.status}`)
  const body = await json(r)
  const keys = Object.keys(body.entries).sort()
  if (keys.join(',') !== 'smoke-a,smoke-b') throw new Error(`got keys=${keys.join(',')}`)
  if (body.entries['smoke-a'] !== 'a' || body.entries['smoke-b'] !== 'b') {
    throw new Error(`bad values: ${JSON.stringify(body.entries)}`)
  }
  return `${keys.length} entries`
})

await step('DELETE /api/sync/items (clear owner)', async () => {
  const r = await fetch(`${ENDPOINT}/api/sync/items`, { method: 'DELETE', headers: SYNC_HEADERS })
  if (!r.ok) throw new Error(`status=${r.status}`)
  const verify = await fetch(`${ENDPOINT}/api/sync/items`, { headers: SYNC_HEADERS })
  const body = await json(verify)
  if (Object.keys(body.entries).length !== 0) throw new Error(`not empty: ${JSON.stringify(body)}`)
  return 'cleared'
})

await step('POST /mcps/markitdown/mcp convert_to_markdown(data:URI)', async () => {
  const html = '<h1>Hello</h1><p>Smoke test</p>'
  const uri = `data:text/html;base64,${Buffer.from(html).toString('base64')}`
  const r = await fetch(`${ENDPOINT}/mcps/markitdown/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'convert_to_markdown', arguments: { uri } } }),
  })
  if (!r.ok) throw new Error(`status=${r.status}`)
  const body = await r.text()
  const ct = r.headers.get('content-type') || ''
  const payload = parseMcp(body, ct)
  const text = payload?.result?.content?.map((c) => c.text || '').join('') || ''
  if (!/Hello/.test(text) || !/Smoke test/.test(text)) {
    throw new Error(`markers missing in: "${text.slice(0, 200)}"`)
  }
  return `${text.length} bytes`
})

function parseMcp(text, contentType) {
  if (contentType.includes('text/event-stream')) {
    const dataLines = text.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).filter(Boolean)
    if (dataLines.length === 0) return null
    try {
      return JSON.parse(dataLines[dataLines.length - 1])
    } catch {
      return null
    }
  }
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const passed = results.filter((r) => r.ok).length
const failed = results.length - passed

console.log('')
console.log('──────────────────────────────────────────────')
console.log(`Total: ${results.length}   PASS: ${passed}   FAIL: ${failed}`)
console.log('──────────────────────────────────────────────')

if (failed > 0) {
  console.log('')
  console.log('Failing steps:')
  for (const r of results) if (!r.ok) console.log(`  - ${r.name}: ${r.detail}`)
  process.exit(1)
}
