import { type LoaderFunctionArgs, Link, useLoaderData } from 'react-router';

import { getBindings } from '@/lib/bindings';

export function meta() {
  return [{ title: 'Help · Ele Autopilot' }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const base = new URL(request.url).origin;
  let version: string | null = null;
  try {
    const { RELEASES } = getBindings();
    const obj = await RELEASES.get('local/latest.txt');
    if (obj) {
      const text = (await obj.text()).trim();
      if (text) version = text;
    }
  } catch {
    /* 兜底 */
  }
  return { base, version };
}

export default function HelpPage() {
  const { base, version } = useLoaderData<typeof loader>();
  const versionLabel = version ? `v${version}` : '—';
  const uvCmd = 'curl -LsSf https://astral.sh/uv/install.sh | sh';
  const installCmd = `curl -fsSL ${base}/install.sh | bash`;
  const runCmd = 'ele-autopilot run';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <Link to="/admin" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>
        ← 回到 Admin
      </Link>

      <h1 style={{ marginTop: 16, marginBottom: 4 }}>ele-autopilot 本地命令</h1>
      <p style={{ color: '#666', marginBottom: 28 }}>
        最新版本: <code>{versionLabel}</code> · 仅 macOS
      </p>

      <Section title="1. 装 uv (已装可跳过)" cmd={uvCmd} />
      <Section title="2. 安装 ele-autopilot" cmd={installCmd} />
      <Section title="3. 启动 (默认监听 127.0.0.1:8000)" cmd={runCmd} />

      <p style={{ color: '#888', fontSize: 12, marginTop: 28 }}>
        安装脚本由 ele-autopilot Worker 动态生成, 产物存于 Cloudflare R2 (
        <code>ele-autopilot-releases</code>).
      </p>
    </div>
  );
}

function Section({ title, cmd }: { title: string; cmd: string }) {
  return (
    <section
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '14px 16px',
        marginBottom: 12,
        background: '#fafafa',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{title}</div>
      <code
        style={{
          display: 'block',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 13,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 4,
          padding: '8px 10px',
          overflowX: 'auto',
          userSelect: 'all',
        }}
      >
        {cmd}
      </code>
    </section>
  );
}
