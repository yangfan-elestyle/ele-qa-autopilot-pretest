import { LoadingOutlined } from '@ant-design/icons';
import { useState } from 'react';

import { useAgentConnection } from '../_hooks/use-agent-connection';
import IntegrationHub, { IntegrationHubTrigger } from './integration-hub';

type AppHeaderProps = {
  subtitle?: string;
  rightExtra?: React.ReactNode;
  /**
   * Returns to gateway landing via full navigation (browser, not RR7 router).
   */
  homeHref?: string;
};

function StatusBadge({
  status,
  uptime,
  onClick,
}: {
  status: 'connected' | 'checking' | 'disconnected';
  uptime?: number;
  onClick?: () => void;
}) {
  const cls =
    status === 'connected'
      ? 'ds-status-pill ds-status-pill-success'
      : status === 'checking'
        ? 'ds-status-pill ds-status-pill-info'
        : 'ds-status-pill ds-status-pill-danger';
  const label =
    status === 'connected'
      ? '本地 Agent · 已连接'
      : status === 'checking'
        ? '本地 Agent · 检测中'
        : '本地 Agent · 未连接';
  const dot =
    status === 'connected' ? (
      <span className="ds-status-dot-pulse" aria-hidden="true" />
    ) : status === 'checking' ? (
      <LoadingOutlined />
    ) : (
      <span className="ds-status-dot" style={{ background: 'currentColor' }} />
    );

  return (
    <button
      type="button"
      onClick={onClick}
      className={cls}
      style={onClick ? { cursor: 'pointer' } : undefined}
      title={
        onClick
          ? '点击打开集成中心 · 本地 Agent'
          : uptime
            ? `已运行 ${Math.floor(uptime / 60)} 分钟`
            : undefined
      }
    >
      {dot}
      {label}
    </button>
  );
}

function AgentStatusAndIntegration() {
  const { status, agentInfo } = useAgentConnection();
  const [hubOpen, setHubOpen] = useState(false);

  return (
    <>
      <StatusBadge
        status={status}
        uptime={agentInfo?.uptime_seconds}
        onClick={() => setHubOpen(true)}
      />
      <IntegrationHubTrigger onClick={() => setHubOpen(true)} />
      <IntegrationHub open={hubOpen} onClose={() => setHubOpen(false)} />
    </>
  );
}

export default function AppHeader({
  subtitle,
  rightExtra,
  homeHref = '/',
}: AppHeaderProps) {
  return (
    <header
      className="flex h-15 items-center gap-3 border-b px-4 sm:px-6"
      style={{
        height: 'var(--ds-header-height)',
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(12px)',
        borderColor: 'var(--ds-border-soft)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <a
        href={homeHref}
        className="flex shrink-0 items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-(--ant-color-fill-tertiary)"
        aria-label="返回首页"
      >
        <span className="ds-brand-mark flex h-8 w-8 items-center justify-center rounded-lg">
          <BrandMark />
        </span>
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="text-[15px] font-semibold tracking-tight text-(--ds-text-primary)">
            QA AutoPilot
          </span>
          <span
            className="text-[10.5px] font-medium tracking-[0.08em] uppercase"
            style={{ color: 'var(--ds-text-tertiary)' }}
          >
            Test Orchestration Console
          </span>
        </span>
      </a>

      {subtitle && (
        <>
          <span className="ds-vrule hidden sm:inline-block" aria-hidden="true" />
          <span className="hidden truncate text-sm font-medium text-(--ds-text-secondary) sm:inline">
            {subtitle}
          </span>
        </>
      )}

      <span className="flex-1" />

      {rightExtra}

      {rightExtra && <span className="ds-vrule hidden sm:inline-block" aria-hidden="true" />}

      <AgentStatusAndIntegration />
    </header>
  );
}

function BrandMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6.5C4 5.12 5.12 4 6.5 4h3.25c1.38 0 2.5 1.12 2.5 2.5v3.25c0 1.38-1.12 2.5-2.5 2.5H6.5C5.12 12.25 4 11.13 4 9.75V6.5Z"
        fill="white"
        opacity=".95"
      />
      <path
        d="M14.25 6.5C14.25 5.12 15.37 4 16.75 4H20v5.75c0 1.38-1.12 2.5-2.5 2.5h-.75c-1.38 0-2.5-1.12-2.5-2.5V6.5Z"
        fill="white"
        opacity=".7"
      />
      <path
        d="M4 14.5C4 13.12 5.12 12 6.5 12h.75c1.38 0 2.5 1.12 2.5 2.5v3.25c0 1.38-1.12 2.5-2.5 2.5H4v-5.75Z"
        fill="white"
        opacity=".7"
      />
      <path
        d="M11.75 14.5c0-1.38 1.12-2.5 2.5-2.5h3.25c1.38 0 2.5 1.12 2.5 2.5v3.25c0 1.38-1.12 2.5-2.5 2.5h-3.25c-1.38 0-2.5-1.12-2.5-2.5V14.5Z"
        fill="white"
        opacity=".95"
      />
    </svg>
  );
}

export { StatusBadge };
