import { MenuOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Drawer, Layout } from 'antd';
import { useState } from 'react';

import AppHeader from '@/app/admin/_components/app-header';
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

  return (
    <Layout className="ds-app-shell h-screen">
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
          className="flex flex-wrap items-start gap-3 border-b px-4 py-3 sm:px-6"
          style={{
            background: 'var(--ds-surface-elevated)',
            borderColor: 'var(--ds-border-soft)',
          }}
        >
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
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-(--ds-text-tertiary) uppercase">
              <span>当前任务</span>
              <span
                className="ds-text-mono rounded-full px-1.5 py-px text-[10px]"
                style={{
                  background: 'var(--ds-surface-subtle)',
                  color: 'var(--ds-text-secondary)',
                }}
              >
                {task.id.slice(0, 8)}
              </span>
            </div>
            <div className="mt-1 max-h-20 overflow-auto text-[13px] leading-relaxed whitespace-pre-wrap text-(--ds-text-primary)">
              <TaskTitleTag title={task.title} />
              {task.text}
            </div>
          </div>
          <div
            className="ds-text-mono shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: 'var(--ds-surface-subtle)',
              color: 'var(--ds-text-secondary)',
            }}
          >
            共 {jobs.length} 次执行
          </div>
        </div>
      )}

      <Layout className="min-h-0 flex-1 bg-transparent">
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
                <span className="text-[13px] font-semibold tracking-tight text-(--ds-text-primary)">
                  执行历史
                </span>
                <span
                  className="ds-text-mono rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    background: 'var(--ds-surface-subtle)',
                    color: 'var(--ds-text-tertiary)',
                  }}
                >
                  {jobs.length}
                </span>
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

        <Content className="overflow-auto p-3 sm:p-6">
          {selectedJob ? (
            <JobDetailPanel
              jobId={selectedJob.id}
              fetchJobDetail={fetchJobDetail}
              fetchJobTaskDetail={fetchJobTaskDetail}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div
                className="ds-surface-card flex flex-col items-center justify-center px-10 py-16 text-center"
                style={{ color: 'var(--ds-text-tertiary)' }}
              >
                <div
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: 'var(--ds-brand-50)', color: 'var(--ds-brand-600)' }}
                >
                  <ReloadOutlined style={{ fontSize: 18 }} />
                </div>
                <div className="text-[14px] font-medium text-(--ds-text-secondary)">
                  {jobs.length === 0 ? '暂无执行历史' : '从左侧选择一条执行记录'}
                </div>
                <div className="mt-1 text-[12px]">
                  {jobs.length === 0
                    ? '在任务列表执行该任务后，记录会显示在这里。'
                    : '所有执行步骤、截图与判定都会在右侧展开。'}
                </div>
              </div>
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
