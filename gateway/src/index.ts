/**
 * qa gateway — 唯一对外公网入口.
 *
 * 路径分发:
 *   /            → landing 页 (双卡片)
 *   /healthz     → "ok"
 *   /autotest    → AUTOTEST (strip /autotest 前缀转发)
 *   其他          → AUTOPILOT (透传, 含 /autopilot, /api/*, /screenshots/*, /releases/*, /install.sh, /help, /favicon.ico)
 *
 * 业务 Worker 已设 workers_dev:false, 仅可经此 gateway 访问.
 */

const LANDING_HTML = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>QA AutoPilot</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1f2328;background:#fafbfc}
main{max-width:880px;margin:0 auto;padding:80px 24px 48px}
h1{font-size:32px;font-weight:600;letter-spacing:-.02em}
p.lead{color:#6e7781;margin-top:8px;font-size:15px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:48px}
@media(max-width:640px){.grid{grid-template-columns:1fr}}
a.card{display:block;padding:28px;border:1px solid #d1d9e0;border-radius:10px;background:#fff;text-decoration:none;color:inherit;transition:border-color .15s,transform .15s,box-shadow .15s}
a.card:hover{border-color:#0969da;transform:translateY(-1px);box-shadow:0 4px 12px rgba(31,35,40,.06)}
a.card h2{font-size:18px;font-weight:600;display:flex;align-items:center;gap:8px}
a.card .tag{font-size:11px;font-weight:500;padding:2px 8px;border-radius:10px;background:#ddf4ff;color:#0969da}
a.card p{color:#6e7781;font-size:14px;margin-top:8px;line-height:1.5}
footer{margin-top:64px;color:#8b949e;font-size:12px}
footer code{background:#eaeef2;padding:1px 6px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
</style>
</head>
<body>
<main>
  <h1>QA AutoPilot</h1>
  <p class="lead">一个域名, 两个工具. 选择入口开始.</p>
  <div class="grid">
    <a class="card" href="/autopilot">
      <h2>AutoPilot <span class="tag">/autopilot</span></h2>
      <p>QA 任务管理后台. 编排任务, 派单到本地 agent, 查看执行结果与截图.</p>
    </a>
    <a class="card" href="/autotest">
      <h2>AutoTest <span class="tag">/autotest</span></h2>
      <p>AI 测试用例生成工具. Confluence / Figma / 图像解析, Prompt 优化.</p>
    </a>
  </div>
  <footer>powered by Cloudflare Workers · <code>qa</code> gateway</footer>
</main>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === '/' || p === '/index.html') {
      return new Response(LANDING_HTML, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    if (p === '/healthz') {
      return new Response('ok', { headers: { 'content-type': 'text/plain' } });
    }

    if (p === '/autotest' || p.startsWith('/autotest/')) {
      const stripped = p.slice('/autotest'.length) || '/';
      const newUrl = new URL(url);
      newUrl.pathname = stripped;
      return env.AUTOTEST.fetch(new Request(newUrl, request));
    }

    return env.AUTOPILOT.fetch(request);
  },
} satisfies ExportedHandler<Env>;
