import { MenuOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, Drawer, Layout, Spin, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';

import JobDetailPanel from '@/app/admin/preview/_components/job-detail-panel';
import JobHistoryList from '@/app/admin/preview/_components/job-history-list';
import TaskTitleTag from '@/app/admin/_components/task-title-tag';
import { useIsMobile } from '@/app/admin/_hooks/use-is-mobile';
import { adminTheme } from '@/app/admin/_theme/antd-theme';
import type { JobListItem, JobLite, JobTask, Task } from '@/app/admin/_types';

export function meta() {
  return [{ title: '任务执行历史 · QA AutoPilot' }];
}

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

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

  const isMobile = useIsMobile();
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

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

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;
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
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const handleMobileSelectJob = (id: string) => {
    setSelectedJobId(id);
    setMobileHistoryOpen(false);
  };

  return (
    <ConfigProvider theme={adminTheme}>
      <Layout className="h-screen">
        <Header className="flex h-auto min-h-16 flex-wrap items-center gap-2 bg-white px-3 py-2 shadow-sm sm:gap-4 sm:px-4">
          {isMobile && (
            <Button
              icon={<MenuOutlined />}
              onClick={() => setMobileHistoryOpen(true)}
              className="shrink-0"
            >
              历史
            </Button>
          )}
          <Title level={5} className="!mb-0 shrink-0">
            任务执行历史
          </Title>
          {task && (
            <div
              className="order-3 min-w-0 basis-full overflow-auto text-sm whitespace-pre-wrap text-gray-500 sm:order-none sm:max-h-20 sm:basis-auto sm:flex-1"
              title={task.text}
            >
              <TaskTitleTag title={task.title} />
              {task.text}
            </div>
          )}
          <Button
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={handleRefresh}
            className="ml-auto shrink-0 sm:ml-0"
          >
            刷新
          </Button>
        </Header>

        <Layout>
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
            <Sider width={320} theme="light" className="border-r border-gray-200">
              <JobHistoryList
                jobs={jobs}
                selectedJobId={selectedJobId}
                onSelect={setSelectedJobId}
                loading={refreshing}
              />
            </Sider>
          )}

          <Content className="overflow-auto bg-gray-50 p-2 sm:p-4">
            {selectedJob ? (
              <JobDetailPanel
                jobId={selectedJob.id}
                fetchJobDetail={fetchJobDetail}
                fetchJobTaskDetail={fetchJobTaskDetail}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                {jobs.length === 0 ? '暂无执行历史' : '请选择一个执行记录'}
              </div>
            )}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
