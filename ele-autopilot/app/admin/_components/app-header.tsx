import {
  HomeOutlined,
  LoadingOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { App, Button, Input, Popover, Tooltip } from 'antd';
import { useEffect, useState } from 'react';

import { useAgentConnection } from '../_hooks/use-agent-connection';

const { TextArea } = Input;

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
}: {
  status: 'connected' | 'checking' | 'disconnected';
  uptime?: number;
}) {
  if (status === 'connected') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        style={{
          background: 'rgba(22, 163, 74, 0.12)',
          color: '#15803d',
          boxShadow: 'inset 0 0 0 1px rgba(22, 163, 74, 0.28)',
        }}
        title={uptime ? `已运行 ${Math.floor(uptime / 60)} 分钟` : undefined}
      >
        <span className="ds-status-dot" style={{ background: '#16a34a' }} />
        本地 Agent · 已连接
      </span>
    );
  }
  if (status === 'checking') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        style={{
          background: 'rgba(37, 99, 235, 0.12)',
          color: '#2563eb',
          boxShadow: 'inset 0 0 0 1px rgba(37, 99, 235, 0.28)',
        }}
      >
        <LoadingOutlined />
        本地 Agent · 检测中
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        background: 'rgba(220, 38, 38, 0.1)',
        color: '#b91c1c',
        boxShadow: 'inset 0 0 0 1px rgba(220, 38, 38, 0.28)',
      }}
    >
      <span className="ds-status-dot" style={{ background: '#dc2626' }} />
      本地 Agent · 未连接
    </span>
  );
}

function AgentSettingsPopover() {
  const { message } = App.useApp();
  const {
    agentUrl,
    setAgentUrl,
    status,
    agentInfo,
    checkConnection,
    isChecking,
    agentConfig,
    setAgentConfig,
  } = useAgentConnection();

  const [inputUrl, setInputUrl] = useState(agentUrl);
  const [open, setOpen] = useState(false);
  const [configText, setConfigText] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => setInputUrl(agentUrl), [agentUrl]);
  useEffect(() => setConfigText(JSON.stringify(agentConfig, null, 2)), [agentConfig]);

  const handleAgentCheck = async () => {
    if (inputUrl !== agentUrl) {
      setAgentUrl(inputUrl);
    } else {
      await checkConnection();
    }
  };

  const handleSaveConfig = async () => {
    try {
      const parsed = JSON.parse(configText);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setConfigError('配置必须是一个 JSON 对象');
        return;
      }
      const ok = await setAgentConfig(parsed);
      if (ok) {
        setConfigError(null);
        message.success('配置已保存');
      } else {
        setConfigError('保存失败，请重试');
      }
    } catch {
      setConfigError('JSON 格式错误');
    }
  };

  const handleClickBadge = () => setOpen((v) => !v);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      title={
        <div className="flex items-center justify-between gap-3 py-1">
          <span className="text-sm font-semibold text-(--ant-color-text)">本地 Agent 配置</span>
          <span className="text-xs text-(--ant-color-text-tertiary)">长连接 · 心跳 2s</span>
        </div>
      }
      content={
        <div className="w-[min(22rem,calc(100vw-3rem))] space-y-3">
          <div>
            <div className="mb-1 text-xs font-medium text-(--ant-color-text-secondary)">
              Agent 地址
            </div>
            <Input
              placeholder="http://127.0.0.1:8000"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onPressEnter={() => void handleAgentCheck()}
              suffix={
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={isChecking}
                  onClick={() => void handleAgentCheck()}
                />
              }
            />
            {status === 'connected' && agentInfo && (
              <div className="mt-1 text-xs text-(--ant-color-text-tertiary)">
                {agentInfo.service.name} · 已运行 {Math.floor(agentInfo.uptime_seconds / 60)} 分钟
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-(--ant-color-text-secondary)">
                执行参数 (JSON)
              </span>
              {configError && (
                <span className="text-xs text-(--ant-color-error)">{configError}</span>
              )}
            </div>
            <TextArea
              value={configText}
              onChange={(e) => {
                setConfigText(e.target.value);
                setConfigError(null);
              }}
              placeholder='{"gemini_model": "gemini-3-flash-preview", "max_steps": 1000}'
              autoSize={{ minRows: 5, maxRows: 12 }}
              className="font-mono text-xs"
              status={configError ? 'error' : undefined}
            />
            <Button
              type="primary"
              size="small"
              block
              onClick={() => void handleSaveConfig()}
              className="mt-2"
              disabled={configError !== null}
            >
              保存配置
            </Button>
          </div>
        </div>
      }
    >
      <div
        onClick={handleClickBadge}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full pr-1 transition-opacity hover:opacity-80"
      >
        <StatusBadge
          status={status}
          uptime={agentInfo?.uptime_seconds}
        />
        <Tooltip title="Agent 设置">
          <Button
            type="text"
            size="small"
            shape="circle"
            icon={<SettingOutlined />}
            className="!text-(--ant-color-text-tertiary)"
          />
        </Tooltip>
      </div>
    </Popover>
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
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm"
          style={{
            background:
              'linear-gradient(135deg, var(--ds-brand-500) 0%, var(--ds-brand-700) 100%)',
            boxShadow: '0 2px 6px rgba(99, 102, 241, 0.35)',
          }}
        >
          <BrandMark />
        </span>
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="text-[15px] font-semibold tracking-tight text-(--ds-text-primary)">
            QA AutoPilot
          </span>
          <span
            className="text-[11px] font-medium tracking-wide uppercase"
            style={{ color: 'var(--ds-text-tertiary)' }}
          >
            Test Orchestration Console
          </span>
        </span>
      </a>

      {subtitle && (
        <>
          <span
            className="hidden h-5 w-px shrink-0 sm:block"
            style={{ background: 'var(--ds-border-default)' }}
          />
          <span className="hidden truncate text-sm font-medium text-(--ds-text-secondary) sm:inline">
            {subtitle}
          </span>
        </>
      )}

      <span className="flex-1" />

      {rightExtra}

      <Tooltip title="返回首页">
        <Button
          type="text"
          shape="circle"
          icon={<HomeOutlined />}
          aria-label="返回首页"
          href={homeHref}
        />
      </Tooltip>

      <AgentSettingsPopover />
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
