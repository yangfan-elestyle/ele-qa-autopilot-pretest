import { App, ConfigProvider } from 'antd';
import { useEffect, useState } from 'react';

import { AgentConnectionProvider } from '../_hooks/use-agent-connection';
import { adminTheme } from '../_theme/antd-theme';
import AdminTaskExplorer from './admin-task-explorer';

export default function AdminTaskExplorerPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ConsoleBootSkeleton />;
  }

  return (
    <ConfigProvider theme={adminTheme}>
      <App>
        <AgentConnectionProvider>
          <AdminTaskExplorer />
        </AgentConnectionProvider>
      </App>
    </ConfigProvider>
  );
}

function ConsoleBootSkeleton() {
  return (
    <div className="ds-app-shell flex h-screen flex-col">
      <style>{`
        @keyframes ds-boot-shimmer {
          0% { opacity: 0.55; }
          50% { opacity: 1; }
          100% { opacity: 0.55; }
        }
        .ds-boot-bar {
          background: linear-gradient(
            90deg,
            var(--ds-surface-subtle) 0%,
            var(--ds-surface-muted) 50%,
            var(--ds-surface-subtle) 100%
          );
          background-size: 200% 100%;
          animation: ds-boot-shimmer 1.6s ease-in-out infinite;
          border-radius: 6px;
        }
      `}</style>
      <header
        className="flex h-15 shrink-0 items-center gap-3 border-b px-4 sm:px-6"
        style={{
          height: 'var(--ds-header-height)',
          background: 'rgba(255, 255, 255, 0.92)',
          borderColor: 'var(--ds-border-soft)',
        }}
      >
        <div
          className="h-8 w-8 rounded-lg"
          style={{
            background:
              'linear-gradient(135deg, var(--ds-brand-500) 0%, var(--ds-brand-700) 100%)',
            opacity: 0.85,
          }}
          aria-hidden="true"
        />
        <div className="ds-boot-bar h-3.5 w-32" />
        <span className="flex-1" />
        <div className="ds-boot-bar h-7 w-36 rounded-full" />
      </header>
      <div className="flex min-h-0 flex-1">
        <aside
          className="flex w-[296px] shrink-0 flex-col gap-3 border-r p-4"
          style={{
            background: 'var(--ds-surface-elevated)',
            borderColor: 'var(--ds-border-soft)',
          }}
          aria-hidden="true"
        >
          <div className="ds-boot-bar h-4 w-24" />
          <div className="ds-boot-bar h-9 w-full" />
          <div className="ds-boot-bar h-9 w-full" />
          <div className="mt-2 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="ds-boot-bar h-6"
                style={{ width: `${70 - i * 4}%` }}
              />
            ))}
          </div>
        </aside>
        <main className="flex min-h-0 flex-1 flex-col p-6">
          <div className="ds-boot-bar h-4 w-40" />
          <div className="ds-boot-bar mt-2 h-7 w-64" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="ds-boot-bar"
                style={{ height: 78, borderRadius: 12 }}
              />
            ))}
          </div>
          <div
            className="ds-surface-card mt-4 flex-1 overflow-hidden"
            aria-hidden="true"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b px-4 py-3"
                style={{ borderColor: 'var(--ds-border-soft)' }}
              >
                <div className="ds-boot-bar h-3 w-14" />
                <div className="ds-boot-bar h-3 flex-1" />
                <div className="ds-boot-bar h-3 w-24" />
                <div className="ds-boot-bar h-3 w-16" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
