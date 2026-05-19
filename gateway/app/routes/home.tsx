import { useEffect, useState } from "react";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "QA AutoPilot · 一个域名, 两个工具" },
    {
      name: "description",
      content:
        "QA AutoPilot: 任务管理后台 + AI 测试用例生成. 唯一对外公网入口, 由 Cloudflare Workers 驱动.",
    },
    { name: "robots", content: "index,follow" },
  ];
}

const INSTALL_PLACEHOLDER = "https://qa.<host>";

export async function loader({ context }: Route.LoaderArgs) {
  const { env } = context.cloudflare;
  let version: string | null = null;
  try {
    const res = await env.AUTOPILOT.fetch(
      new Request("https://autopilot.internal/releases/local/latest.txt", {
        cf: { cacheTtl: 60 },
      }),
    );
    if (res.ok) {
      const text = (await res.text()).trim();
      if (/^[0-9][0-9a-zA-Z.\-+]{0,31}$/.test(text)) {
        version = text;
      }
    }
  } catch {
    /* fall back to client fetch */
  }
  return { version };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const initialVersion = loaderData.version;
  const [version, setVersion] = useState<string | null>(initialVersion);
  const [origin, setOrigin] = useState<string>(INSTALL_PLACEHOLDER);

  useEffect(() => {
    setOrigin(window.location.origin);
    if (!initialVersion) {
      fetch("/releases/local/latest.txt", { cache: "no-store" })
        .then((r) => (r.ok ? r.text() : ""))
        .then((t) => {
          const v = (t || "").trim();
          if (/^[0-9][0-9a-zA-Z.\-+]{0,31}$/.test(v)) setVersion(v);
        })
        .catch(() => {});
    }
  }, [initialVersion]);

  const installCmd = `curl -fsSL ${origin}/install.sh | bash`;

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              Q
            </span>
            <span>QA AutoPilot</span>
          </div>
          <span
            className="status"
            title="gateway 健康"
            aria-label="服务运行中"
          >
            <span className="status-dot" aria-hidden="true" />
            operational
          </span>
        </header>

        <section className="hero">
          <span className="hero-eyebrow">qa gateway</span>
          <h1>
            一个域名, <em>两个工具.</em>
          </h1>
          <p>
            QA 流程的统一入口. AutoPilot 编排任务并派单到本地 agent;
            AutoTest 用 AI 把需求与设计稿翻成测试用例.
          </p>
        </section>

        <section className="cards" aria-label="子工具入口">
          <a className="card" href="/autopilot">
            <span className="card-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <h2>
              AutoPilot <span className="card-path">/autopilot</span>
            </h2>
            <p>
              QA 任务管理后台. 编排任务, 派单到本地 agent, 查看执行结果与截图.
            </p>
            <span className="card-arrow">
              打开后台
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          </a>

          <a className="card" href="/autotest">
            <span className="card-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
                <path d="m9 13 2 2 4-4" />
              </svg>
            </span>
            <h2>
              AutoTest <span className="card-path">/autotest</span>
            </h2>
            <p>
              AI 测试用例生成. Confluence / Figma / 图像解析, 配套 Prompt 优化.
            </p>
            <span className="card-arrow">
              进入工作台
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          </a>
        </section>

        <section className="install" aria-labelledby="install-title">
          <div className="install-head">
            <h2 id="install-title">本地 agent 安装</h2>
            <span className="ver" aria-label="最新版本">
              {version ? `v${version}` : "v—"}
            </span>
            <span className="meta">macOS 专用 · AutoPilot 派单时本机执行</span>
          </div>
          <p className="install-desc">
            三步完成. 启动后 agent 监听 <code>0.0.0.0:8000</code>,
            等待 AutoPilot 派单.
          </p>
          <ol className="steps">
            <Step
              num={1}
              title="装 uv (已装可跳过)"
              cmd="curl -LsSf https://astral.sh/uv/install.sh | sh"
            />
            <Step num={2} title="安装 ele-autopilot" cmd={installCmd} />
            <Step
              num={3}
              title="启动 (需 Gemini API Key)"
              cmd="ELE_LLM_API_KEY=<your-gemini-api-key> ele-autopilot"
            />
          </ol>
          <p className="install-foot">
            安装脚本由 ele-autopilot Worker 动态生成, 产物存于 Cloudflare R2
            <code>ele-autopilot-releases</code>.
          </p>
        </section>

        <footer className="footer">
          <span>
            powered by Cloudflare Workers · <code>qa</code> gateway
          </span>
          <nav className="footer-links" aria-label="footer 链接">
            <a href="/healthz">healthz</a>
            <a href="/autopilot">autopilot</a>
            <a href="/autotest">autotest</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}

function Step({ num, title, cmd }: { num: number; title: string; cmd: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <li>
      <div className="step-title">
        <span className="step-num" aria-hidden="true">
          {num}
        </span>
        {title}
      </div>
      <div className="cmd-row">
        <code className="cmd">{cmd}</code>
        <button
          className={`copy${copied ? " ok" : ""}`}
          type="button"
          onClick={copy}
          aria-label={`复制: ${title}`}
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>
    </li>
  );
}
