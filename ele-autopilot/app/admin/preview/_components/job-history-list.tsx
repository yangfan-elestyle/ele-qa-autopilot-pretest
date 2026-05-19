import { CalendarOutlined, ClockCircleOutlined, InboxOutlined } from '@ant-design/icons';
import { Spin } from 'antd';

import EmptyState from '@/app/admin/_components/empty-state';
import StatusPill from '@/app/admin/_components/status-pill';
import type { JobListItem, JobStatus } from '@/app/admin/_types';

type JobHistoryListProps = {
  jobs: JobListItem[];
  selectedJobId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
};

const STATUS_ACCENT: Record<JobStatus, string> = {
  pending: 'rgba(148, 163, 184, 0.55)',
  running: '#2563eb',
  completed: '#16a34a',
  failed: '#dc2626',
};

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 86_400_000 * 7) return `${Math.floor(diff / 86_400_000)} 天前`;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-CN', {
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
      <div className="flex h-full items-center justify-center px-4">
        <EmptyState
          icon={<InboxOutlined />}
          title="暂无执行历史"
          description="任务首次执行后，记录会以时间倒序出现在这里。"
          size="sm"
          tone="neutral"
        />
      </div>
    );
  }

  return (
    <Spin spinning={loading}>
      <div className="h-full overflow-auto px-2 py-2">
        {jobs.map((job) => {
          const isSelected = job.id === selectedJobId;
          const accent = STATUS_ACCENT[job.status];
          return (
            <button
              key={job.id}
              type="button"
              onClick={() => onSelect(job.id)}
              className={`ds-job-card ${isSelected ? 'ds-job-card-selected' : ''}`}
            >
              <span
                aria-hidden="true"
                className="ds-job-card-accent"
                style={{ background: accent, opacity: isSelected ? 1 : 0.85 }}
              />
              <div className="flex items-center justify-between gap-2">
                <StatusPill status={job.status} size="sm" />
                <span
                  className="ds-text-mono text-[11px]"
                  style={{ color: 'var(--ds-text-tertiary)' }}
                  title={new Date(job.created_at).toLocaleString('zh-CN')}
                >
                  {formatRelative(job.created_at)}
                </span>
              </div>
              <div
                className="mt-1.5 flex items-center justify-between gap-2 text-[11px]"
                style={{ color: 'var(--ds-text-tertiary)' }}
              >
                <span className="ds-text-mono truncate" title={job.id}>
                  #{job.id.slice(0, 8)}
                </span>
                <span className="ds-text-mono inline-flex items-center gap-2">
                  <span title="开始时间">
                    <CalendarOutlined className="mr-0.5 opacity-70" />
                    {formatTime(job.started_at ?? job.created_at)}
                  </span>
                  <span title="耗时">
                    <ClockCircleOutlined className="mr-0.5 opacity-70" />
                    {formatDuration(job.started_at, job.completed_at)}
                  </span>
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
