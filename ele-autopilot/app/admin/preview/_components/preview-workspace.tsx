import {
  HistoryOutlined,
  InboxOutlined,
  MenuOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Layout } from 'antd';
import { useState } from 'react';

import AppHeader from '@/app/admin/_components/app-header';
import EmptyState from '@/app/admin/_components/empty-state';
import SourceTag from '@/app/admin/_components/source-tag';
import TaskTitleTag from '@/app/admin/_components/task-title-tag';
import { useIsMobile } from '@/app/admin/_hooks/use-is-mobile';
import type { JobListItem, JobLite, JobTask, Task } from '@/app/admin/_types';

import JobDetailPanel from './job-detail-panel';
import JobHistoryList from './job-history-list';

const { Sider, Content } = Layout;

type PreviewWorkspaceProps = {
  task: Task | null;
  jobs: JobListItem[];
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  fetchJobDetail: (jobId: string) => Promise<JobLite | null>;
  fetchJobTaskDetail: (jobId: string, taskIndex: number) => Promise<JobTask | null>;
};

export default function PreviewWorkspace({
  task,
  jobs,
  selectedJobId,
  onSelectJob,
  refreshing,
  onRefresh,
  fetchJobDetail,
  fetchJobTaskDetail,
}: PreviewWorkspaceProps) {
  const isMobile = useIsMobile();
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

  const handleMobileSelectJob = (id: string) => {
    onSelectJob(id);
    setMobileHistoryOpen(false);
  };

  const successCount = jobs.filter((j) => j.status === 'completed').length;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;
  const activeCount = jobs.filter(
    (j) => j.status === 'running' || j.status === 'pending',
  ).length;

  return (
    <Layout className="ds-app-shell min-h-screen md:!h-screen">
      <AppHeader
        subtitle={task?.title ?? '任务执行历史'}
        rightExtra={
          <Button
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={onRefresh}
            size="middle"
          >
            刷新
          </Button>
        }
      />

      {/* Task summary banner */}
      {task && (
        <div
          className="border-b px-4 py-3 sm:px-6"
          style={{
            background: 'var(--ds-surface-elevated)',
            borderColor: 'var(--ds-border-soft)',
          }}
        >
          <div className="flex flex-wrap items-start gap-3">
            {isMobile && (
              <Button
                icon={<MenuOutlined />}
                onClick={() => setMobileHistoryOpen(true)}
                size="small"
              >
                历史
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <div className="ds-page-breadcrumb mb-1.5">
                <span>任务工作台</span>
                <span className="ds-page-breadcrumb-sep">›</span>
                <span className="ds-page-breadcrumb-current">执行历史</span>
                <span className="ds-page-breadcrumb-sep">›</span>
                <span
                  className="ds-text-mono ds-page-breadcrumb-current"
                  style={{ fontSize: 11 }}
                  title={task.id}
                >
                  #{task.id.slice(0, 8)}
                </span>
              </div>
              <TaskSummaryText title={task.title} text={task.text} source={task.source} />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <StatBadge label="总" value={jobs.length} tone="neutral" />
              <StatBadge label="成功" value={successCount} tone="success" />
              <StatBadge label="失败" value={failedCount} tone="danger" />
              {activeCount > 0 && (
                <StatBadge label="进行中" value={activeCount} tone="info" />
              )}
            </div>
          </div>
        </div>
      )}

      <Layout className="bg-transparent md:min-h-0 md:flex-1">
        {isMobile ? (
          <Drawer
            open={mobileHistoryOpen}
            onClose={() => setMobileHistoryOpen(false)}
            placement="left"
            width="85vw"
            title="执行历史"
            styles={{ body: { padding: 0 } }}
          >
            <JobHistoryList
              jobs={jobs}
              selectedJobId={selectedJobId}
              onSelect={handleMobileSelectJob}
              loading={refreshing}
            />
          </Drawer>
        ) : (
          <Sider
            width={340}
            theme="light"
            style={{
              background: 'var(--ds-surface-elevated)',
              borderRight: '1px solid var(--ds-border-soft)',
            }}
          >
            <div className="flex h-full flex-col">
              <div
                className="flex shrink-0 items-center justify-between border-b px-4 py-3"
                style={{ borderColor: 'var(--ds-border-soft)' }}
              >
                <div className="flex items-center gap-2">
                  <HistoryOutlined
                    style={{ color: 'var(--ds-brand-600)', fontSize: 14 }}
                  />
                  <span className="text-[13px] font-semibold tracking-tight text-(--ds-text-primary)">
                    执行历史
                  </span>
                </div>
                <span className="ds-chip ds-chip-neutral ds-text-mono">{jobs.length}</span>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <JobHistoryList
                  jobs={jobs}
                  selectedJobId={selectedJobId}
                  onSelect={onSelectJob}
                  loading={refreshing}
                />
              </div>
            </div>
          </Sider>
        )}

        <Content className="p-3 sm:p-6 md:overflow-auto">
          {selectedJob ? (
            <JobDetailPanel
              jobId={selectedJob.id}
              fetchJobDetail={fetchJobDetail}
              fetchJobTaskDetail={fetchJobTaskDetail}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="ds-surface-card w-full max-w-md">
                <EmptyState
                  icon={<InboxOutlined />}
                  title={jobs.length === 0 ? '暂无执行历史' : '从左侧选择一条执行记录'}
                  description={
                    jobs.length === 0
                      ? '在任务列表执行该任务后，记录会显示在这里。每次执行的步骤、截图与 AI 判定都会完整保留。'
                      : '所有执行步骤、截图与 AI 判定都会在此处展开。'
                  }
                  size="lg"
                />
              </div>
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

function StatBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'danger' | 'info';
}) {
  return (
    <span className={`ds-chip ds-chip-${tone}`} style={{ gap: '6px' }}>
      <span className="opacity-70">{label}</span>
      <span className="ds-text-mono text-[12px]">{value}</span>
    </span>
  );
}

function TaskSummaryText({
  title,
  text,
  source,
}: {
  title: string | null;
  text: string;
  source?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const compact = text.length > 240;
  return (
    <div className="min-w-0">
      <div
        className={
          expanded
            ? 'max-h-72 overflow-auto text-[13px] leading-relaxed whitespace-pre-wrap text-(--ds-text-primary)'
            : 'overflow-hidden text-[13px] leading-relaxed whitespace-pre-wrap text-(--ds-text-primary)'
        }
        style={
          expanded
            ? undefined
            : ({
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              } as React.CSSProperties)
        }
      >
        <SourceTag source={source} />
        <TaskTitleTag title={title} />
        {text}
      </div>
      {compact && (
        <button
          type="button"
          className="mt-1 inline-flex items-center text-[11.5px] font-medium text-(--ds-brand-700) hover:text-(--ds-brand-600)"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '收起' : '展开任务详情'}
        </button>
      )}
    </div>
  );
}
