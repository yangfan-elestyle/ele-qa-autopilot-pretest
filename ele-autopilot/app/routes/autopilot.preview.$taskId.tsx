import { App, ConfigProvider, Spin } from 'antd';
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
    return (
      <div className="ds-app-shell flex h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
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
