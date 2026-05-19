import { useEffect, useState } from "react";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "QA AutoPilot" },
    {
      name: "description",
      content: "QA AutoPilot — 任务编排与 AI 测试用例工作台.",
    },
    { name: "robots", content: "index,follow" },
  ];
}

const VERSION_RE = /^[0-9][0-9a-zA-Z.\-+]{0,31}$/;

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = context.cloudflare;
  const origin = new URL(request.url).origin;
  let version: string | null = null;
  try {
    const res = await env.AUTOPILOT.fetch(
      new Request("https://autopilot.internal/releases/local/latest.txt"),
    );
    if (res.ok) {
      const text = (await res.text()).trim();
      if (VERSION_RE.test(text)) version = text;
    }
  } catch {
    /* fall back to client fetch */
  }
  return { version, origin };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const [version, setVersion] = useState<string | null>(loaderData.version);

  useEffect(() => {
    if (loaderData.version) return;
    fetch("/releases/local/latest.txt", { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => {
        const v = (t || "").trim();
        if (VERSION_RE.test(v)) setVersion(v);
      })
      .catch(() => {});
  }, [loaderData.version]);

  const installCmd = `curl -fsSL ${loaderData.origin}/install.sh | bash`;

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <img
              className="brand-mark"
              src="/favicon.svg"
              alt=""
              width={28}
              height={28}
            />
            <span>QA AutoPilot</span>
          </div>
          <span className="status" aria-label="服务运行中">
            <span className="status-dot" aria-hidden="true" />
            运行中
          </span>
        </header>

        <section className="hero">
          <h1>
            QA 工作流, <em>一站做完.</em>
          </h1>
          <p>
            编排测试任务、派单到本地浏览器 agent, 同时用 AI 把需求与设计稿翻成可执行测试用例.
          </p>
        </section>

        <section className="cards" aria-label="工具入口">
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
            <h2>AutoPilot</h2>
            <p>
              编排 QA 任务、派单到本地浏览器 agent, 实时查看执行结果与截图.
            </p>
            <span className="card-arrow">
              打开任务后台
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
            <h2>AutoTest</h2>
            <p>
              基于需求文档、Figma 与界面截图, 用 AI 直接生成结构化测试用例.
            </p>
            <span className="card-arrow">
              进入用例工作台
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
            <h2 id="install-title">安装本地 agent</h2>
            <span className="meta">macOS · AutoPilot 派单时由本机执行任务</span>
          </div>
          <p className="install-desc">
            两步完成. 启动后 AutoPilot 工作台会自动连接本地 agent, 即可派单执行任务.
          </p>
          <ol className="steps">
            <Step num={1} title="安装 ele-autopilot" cmd={installCmd} />
            <Step
              num={2}
              title="启动 (需 Gemini API Key)"
              cmd="ELE_LLM_API_KEY=<your-gemini-api-key> ele-autopilot"
            />
          </ol>
        </section>

        <footer className="footer">
          <span className="footer-version" aria-label="当前版本">
            {version ? `v${version}` : "v—"}
          </span>
          <nav className="footer-links" aria-label="footer 链接">
            <a href="/autopilot">AutoPilot</a>
            <a href="/autotest">AutoTest</a>
            <a href="/healthz">服务状态</a>
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
    navigator.clipboard
      .writeText(cmd)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {});
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
