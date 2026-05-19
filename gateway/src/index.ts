/**
 * qa gateway — 唯一对外公网入口.
 *
 * 路径分发:
 *   /            → landing 页 (双卡片 + 本地 agent 安装区块)
 *   /healthz     → "ok"
 *   /autotest    → AUTOTEST (strip /autotest 前缀转发)
 *   其他          → AUTOPILOT (透传, 含 /autopilot, /api/*, /screenshots/*, /releases/*, /install.sh, /favicon.ico)
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
section.install{margin-top:48px;padding:24px;border:1px solid #d1d9e0;border-radius:10px;background:#fff}
section.install header{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
section.install h2{font-size:16px;font-weight:600}
section.install .ver{font-size:11px;font-weight:500;padding:2px 8px;border-radius:10px;background:#eaeef2;color:#1f2328;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
section.install .meta{color:#6e7781;font-size:13px;margin-left:auto}
section.install ol{list-style:none;margin-top:16px;display:grid;gap:10px}
section.install li{border:1px solid #eaeef2;border-radius:8px;padding:10px 12px;background:#fafbfc}
section.install li .title{font-size:13px;color:#6e7781;margin-bottom:6px}
section.install li .row{display:flex;align-items:center;gap:8px}
section.install code{flex:1;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:#1f2328;background:transparent;overflow-x:auto;white-space:nowrap}
section.install button.copy{flex-shrink:0;border:1px solid #d1d9e0;background:#fff;border-radius:6px;padding:4px 10px;font-size:12px;color:#1f2328;cursor:pointer;transition:background .15s,border-color .15s}
section.install button.copy:hover{border-color:#0969da;color:#0969da}
section.install button.copy.ok{border-color:#1a7f37;color:#1a7f37}
section.install p.foot{color:#6e7781;font-size:12px;margin-top:14px;line-height:1.5}
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

  <section class="install" aria-labelledby="install-title">
    <header>
      <h2 id="install-title">本地 agent 安装</h2>
      <span class="ver" id="ver">v—</span>
      <span class="meta">仅 macOS · 由 AutoPilot 派单时在本机执行任务</span>
    </header>
    <ol>
      <li>
        <div class="title">1. 装 uv (已装可跳过)</div>
        <div class="row">
          <code id="cmd1">curl -LsSf https://astral.sh/uv/install.sh | sh</code>
          <button class="copy" data-target="cmd1" type="button">复制</button>
        </div>
      </li>
      <li>
        <div class="title">2. 安装 ele-autopilot</div>
        <div class="row">
          <code id="cmd2">curl -fsSL …/install.sh | bash</code>
          <button class="copy" data-target="cmd2" type="button">复制</button>
        </div>
      </li>
      <li>
        <div class="title">3. 启动 (监听 0.0.0.0:8000, 需 Gemini API Key)</div>
        <div class="row">
          <code id="cmd3">ELE_LLM_API_KEY=&lt;your-gemini-api-key&gt; ele-autopilot</code>
          <button class="copy" data-target="cmd3" type="button">复制</button>
        </div>
      </li>
    </ol>
    <p class="foot">安装脚本由 ele-autopilot Worker 动态生成, 产物存于 Cloudflare R2 (<code>ele-autopilot-releases</code>).</p>
  </section>

  <footer>powered by Cloudflare Workers · <code>qa</code> gateway</footer>
</main>
<script>
(function () {
  var origin = location.origin;
  var cmd2 = document.getElementById('cmd2');
  if (cmd2) cmd2.textContent = 'curl -fsSL ' + origin + '/install.sh | bash';

  fetch('/releases/local/latest.txt', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.text() : ''; })
    .then(function (t) {
      var v = (t || '').trim();
      if (v) {
        var el = document.getElementById('ver');
        if (el) el.textContent = 'v' + v;
      }
    })
    .catch(function () { /* 兜底: 保留占位 v— */ });

  document.querySelectorAll('button.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-target');
      var src = id && document.getElementById(id);
      if (!src || !navigator.clipboard) return;
      navigator.clipboard.writeText(src.textContent || '').then(function () {
        var prev = btn.textContent;
        btn.textContent = '已复制';
        btn.classList.add('ok');
        setTimeout(function () {
          btn.textContent = prev;
          btn.classList.remove('ok');
        }, 1200);
      });
    });
  });
})();
</script>
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
