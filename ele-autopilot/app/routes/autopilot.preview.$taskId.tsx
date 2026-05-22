import { App, ConfigProvider } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';

import PreviewWorkspace from '@/app/admin/preview/_components/preview-workspace';
import { AgentConnectionProvider } from '@/app/admin/_hooks/use-agent-connection';
import { adminTheme } from '@/app/admin/_theme/antd-theme';
import type { JobListItem, JobLite, JobTask, Task } from '@/app/admin/_types';

export function meta() {
  return [{ title: '任务执行历史 · QA AutoPilot' }];
}

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export default function PreviewRoute() {
  const params = useParams();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/tasks/${taskId}`);
      if (response.ok) {
        const data: Task = await response.json();
        setTask(data);
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
    }
  }, [taskId]);

  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/jobs?filter=${encodeURIComponent(JSON.stringify({ task_id: taskId }))}&range=${encodeURIComponent(JSON.stringify([0, 99]))}&sort=${encodeURIComponent(JSON.stringify(['created_at', 'DESC']))}`,
      );
      if (response.ok) {
        const data: JobListItem[] = await response.json();
        setJobs(data);
        if (!selectedJobId && data.length > 0) {
          setSelectedJobId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  }, [taskId, selectedJobId]);

  const fetchJobDetail = useCallback(async (jobId: string): Promise<JobLite | null> => {
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`);
      if (response.ok) {
        const result: ApiResponse<JobLite> = await response.json();
        return result.data;
      }
    } catch (error) {
      console.error('Failed to fetch job detail:', error);
    }
    return null;
  }, []);

  const fetchJobTaskDetail = useCallback(
    async (jobId: string, taskIndex: number): Promise<JobTask | null> => {
      try {
        const response = await fetch(`/api/admin/jobs/${jobId}/tasks/${taskIndex}`);
        if (response.ok) {
          const result: ApiResponse<JobTask> = await response.json();
          return result.data;
        }
      } catch (error) {
        console.error('Failed to fetch job task detail:', error);
      }
      return null;
    },
    [],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchTask(), fetchJobs()]);
      setLoading(false);
    };
    load();
  }, [fetchTask, fetchJobs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const hasRunningJob = jobs.some((j) => j.status === 'running' || j.status === 'pending');

  useEffect(() => {
    if (!hasRunningJob) return;
    const interval = setInterval(() => {
      fetchJobs();
    }, 3000);
    return () => clearInterval(interval);
  }, [hasRunningJob, fetchJobs]);

  if (loading) {
    return <PreviewBootSkeleton />;
  }

  return (
    <ConfigProvider theme={adminTheme}>
      <App>
        <AgentConnectionProvider>
          <PreviewWorkspace
            task={task}
            jobs={jobs}
            selectedJobId={selectedJobId}
            onSelectJob={setSelectedJobId}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            fetchJobDetail={fetchJobDetail}
            fetchJobTaskDetail={fetchJobTaskDetail}
          />
        </AgentConnectionProvider>
      </App>
    </ConfigProvider>
  );
}

function PreviewBootSkeleton() {
  return (
    <div className="ds-app-shell flex h-screen flex-col">
      <header
        className="flex shrink-0 items-center gap-3 border-b px-4 sm:px-6"
        style={{
          height: 'var(--ds-header-height)',
          background: 'rgba(255, 255, 255, 0.92)',
          borderColor: 'var(--ds-border-soft)',
        }}
      >
        <div
          className="ds-brand-mark h-8 w-8 rounded-lg"
          style={{ opacity: 0.85 }}
          aria-hidden="true"
        />
        <div className="ds-skeleton h-3.5 w-40" />
        <span className="flex-1" />
        <div className="ds-skeleton h-7 w-24 rounded" />
      </header>
      <div
        className="flex flex-wrap items-start gap-3 border-b px-4 py-3 sm:px-6"
        style={{
          background: 'var(--ds-surface-elevated)',
          borderColor: 'var(--ds-border-soft)',
        }}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="ds-skeleton h-3 w-24" />
          <div className="ds-skeleton h-4 w-2/3" />
          <div className="ds-skeleton h-3.5 w-1/2" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside
          className="hidden w-[340px] shrink-0 border-r md:block"
          style={{
            background: 'var(--ds-surface-elevated)',
            borderColor: 'var(--ds-border-soft)',
          }}
        >
          <div
            className="flex h-12 shrink-0 items-center justify-between border-b px-4"
            style={{ borderColor: 'var(--ds-border-soft)' }}
          >
            <div className="ds-skeleton h-4 w-24" />
            <div className="ds-skeleton h-5 w-8 rounded-full" />
          </div>
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border p-3"
                style={{ borderColor: 'var(--ds-border-soft)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="ds-skeleton h-5 w-16 rounded-full" />
                  <div className="ds-skeleton h-3 w-10" />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="ds-skeleton h-3 w-14" />
                  <div className="ds-skeleton h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </aside>
        <main className="flex min-h-0 flex-1 flex-col gap-4 p-3 sm:p-6">
          <div
            className="ds-surface-card flex flex-col gap-3 p-4"
            aria-hidden="true"
          >
            <div className="flex items-center gap-2">
              <div className="ds-skeleton h-4 w-20" />
              <div className="ds-skeleton h-5 w-14 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="ds-skeleton"
                  style={{ height: 72, borderRadius: 12 }}
                />
              ))}
            </div>
            <div className="ds-skeleton h-2 w-full rounded-full" />
            <div className="ds-skeleton h-3 w-3/5" />
          </div>
          <div className="ds-surface-card p-4">
            <div className="ds-skeleton h-4 w-32" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded border px-3 py-2"
                  style={{ borderColor: 'var(--ds-border-soft)' }}
                >
                  <div
                    className="ds-skeleton h-5 w-5"
                    style={{ borderRadius: 6 }}
                  />
                  <div className="ds-skeleton h-3 flex-1" />
                  <div className="ds-skeleton h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
