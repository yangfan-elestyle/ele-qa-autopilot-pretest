import { Empty, Spin } from 'antd';

import StatusPill from '@/app/admin/_components/status-pill';
import type { JobListItem } from '@/app/admin/_types';

type JobHistoryListProps = {
  jobs: JobListItem[];
  selectedJobId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return '-';
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const duration = Math.round((end - start) / 1000);
  if (duration < 60) return `${duration}s`;
  if (duration < 3600) return `${Math.floor(duration / 60)}m${duration % 60}s`;
  return `${Math.floor(duration / 3600)}h${Math.floor((duration % 3600) / 60)}m`;
}

export default function JobHistoryList({
  jobs,
  selectedJobId,
  onSelect,
  loading,
}: JobHistoryListProps) {
  if (jobs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span className="text-(--ds-text-tertiary)">暂无执行历史</span>}
        />
      </div>
    );
  }

  return (
    <Spin spinning={loading}>
      <div className="h-full overflow-auto px-2 py-2">
        {jobs.map((job) => {
          const isSelected = job.id === selectedJobId;
          return (
            <button
              key={job.id}
              type="button"
              onClick={() => onSelect(job.id)}
              className="block w-full cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-all"
              style={{
                borderColor: isSelected
                  ? 'transparent'
                  : 'var(--ds-border-soft)',
                background: isSelected
                  ? 'var(--ds-brand-50)'
                  : 'var(--ds-surface-elevated)',
                boxShadow: isSelected
                  ? '0 0 0 1px var(--ds-brand-500), 0 2px 6px rgba(99, 102, 241, 0.16)'
                  : 'var(--ds-shadow-xs)',
                marginBottom: 6,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <StatusPill status={job.status} size="sm" />
                <span
                  className="ds-text-mono text-[11px]"
                  style={{ color: 'var(--ds-text-tertiary)' }}
                >
                  {formatDateTime(job.created_at)}
                </span>
              </div>
              <div
                className="mt-1.5 flex items-center justify-between text-[11px]"
                style={{ color: 'var(--ds-text-tertiary)' }}
              >
                <span className="ds-text-mono">#{job.id.slice(0, 8)}</span>
                <span className="ds-text-mono">
                  耗时 {formatDuration(job.started_at, job.completed_at)}
                </span>
              </div>
              {job.error && (
                <div
                  className="mt-1.5 truncate rounded px-1.5 py-0.5 text-[11px]"
                  style={{
                    background: 'rgba(220, 38, 38, 0.08)',
                    color: '#b91c1c',
                  }}
                  title={job.error}
                >
                  {job.error}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Spin>
  );
}
