import { Button, Card, Space, Tag, Typography } from 'antd';
import { type LoaderFunctionArgs, Link, useLoaderData } from 'react-router';

import { getBindings } from '@/lib/bindings';

const { Title, Paragraph, Text } = Typography;

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
  const sections: Array<{ title: string; cmd: string }> = [
    { title: '1. 装 uv (已装可跳过)', cmd: 'curl -LsSf https://astral.sh/uv/install.sh | sh' },
    { title: '2. 安装 ele-autopilot', cmd: `curl -fsSL ${base}/install.sh | bash` },
    { title: '3. 启动 (默认监听 127.0.0.1:8000)', cmd: 'ele-autopilot run' },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link to="/autopilot">← 回到 AutoPilot</Link>

      <Title level={2} className="!mb-1 !mt-4">
        ele-autopilot 本地命令
      </Title>
      <Paragraph type="secondary" className="!mb-7">
        最新版本 <Tag>{version ? `v${version}` : '—'}</Tag> · 仅 macOS
      </Paragraph>

      <Space direction="vertical" size="middle" className="w-full">
        {sections.map((s) => (
          <Card key={s.title} size="small" title={s.title}>
            <Text code copyable className="block break-all">
              {s.cmd}
            </Text>
          </Card>
        ))}
      </Space>

      <Paragraph type="secondary" className="!mt-7 !text-xs">
        安装脚本由 ele-autopilot Worker 动态生成, 产物存于 Cloudflare R2 (
        <Text code>ele-autopilot-releases</Text>).
      </Paragraph>
    </div>
  );
}
