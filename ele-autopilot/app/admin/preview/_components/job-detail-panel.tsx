import { StopOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  message,
  Popconfirm,
  Spin,
  Typography,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

import StatusPill from '../../_components/status-pill';
import { stopJobOnLocal } from '../../_services/local-api';

import JobTaskDetail from './job-task-detail';
import type { JobLite, JobStatus, JobTask, JobTaskLite } from '../../_types';
import TaskTitleTag from '../../_components/task-title-tag';

const { Text } = Typography;

type JobDetailPanelProps = {
  jobId: string;
  fetchJobDetail: (jobId: string) => Promise<JobLite | null>;
  fetchJobTaskDetail: (jobId: string, taskIndex: number) => Promise<JobTask | null>;
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN');
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return '-';
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const duration = Math.round((end - start) / 1000);
  if (duration < 60) return `${duration}秒`;
  if (duration < 3600) return `${Math.floor(duration / 60)}分${duration % 60}秒`;
  return `${Math.floor(duration / 3600)}时${Math.floor((duration % 3600) / 60)}分`;
}

function StatBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'danger' | 'info';
}) {
  const toneMap: Record<typeof tone, { color: string; bg: string }> = {
    neutral: { color: '#475569', bg: 'rgba(148, 163, 184, 0.12)' },
    success: { color: '#15803d', bg: 'rgba(22, 163, 74, 0.1)' },
    danger: { color: '#b91c1c', bg: 'rgba(220, 38, 38, 0.08)' },
    info: { color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  };
  const t = toneMap[tone];
  return (
    <div
      className="flex flex-col items-start rounded-lg px-3 py-2"
      style={{ background: t.bg }}
    >
      <span className="text-[11px] font-medium" style={{ color: t.color, opacity: 0.85 }}>
        {label}
      </span>
      <span
        className="ds-text-mono text-[18px] font-semibold"
        style={{ color: t.color, lineHeight: 1.1 }}
      >
        {value}
      </span>
    </div>
  );
}

export default function JobDetailPanel({
  jobId,
  fetchJobDetail,
  fetchJobTaskDetail,
}: JobDetailPanelProps) {
  const [job, setJob] = useState<JobLite | null>(null);
  const [loading, setLoading] = useState(true);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [taskDetailCache, setTaskDetailCache] = useState<Map<number, JobTask>>(new Map());
  const [loadingTaskIndex, setLoadingTaskIndex] = useState<number | null>(null);

  const loadJob = useCallback(async () => {
    const data = await fetchJobDetail(jobId);
    if (data) setJob(data);
    setLoading(false);
  }, [jobId, fetchJobDetail]);

  const loadTaskDetail = useCallback(
    async (taskIndex: number) => {
      if (taskDetailCache.has(taskIndex)) return;
      setLoadingTaskIndex(taskIndex);
      try {
        const detail = await fetchJobTaskDetail(jobId, taskIndex);
        if (detail) {
          setTaskDetailCache((prev) => new Map(prev).set(taskIndex, detail));
        }
      } finally {
        setLoadingTaskIndex(null);
      }
    },
    [jobId, fetchJobTaskDetail, taskDetailCache],
  );

  const handleCollapseChange = useCallback(
    (key: string | string[]) => {
      const activeKey = Array.isArray(key) ? key[0] : key;
      if (!activeKey || !job) return;
      const task = job.tasks.find((t) => t.id === activeKey);
      if (task) loadTaskDetail(task.task_index);
    },
    [job, loadTaskDetail],
  );

  useEffect(() => {
    setLoading(true);
    setTaskDetailCache(new Map());
    loadJob();
  }, [loadJob]);

  const handleStopJob = useCallback(async () => {
    if (!job) return;
    try {
      await stopJobOnLocal(job.id);
      message.success('已发送停止信号');
      loadJob();
    } catch (error) {
      message.error(`停止失败: ${(error as Error).message}`);
    }
  }, [job, loadJob]);

  const handleStopTask = useCallback(
    async (taskId: string) => {
      if (!job) return;
      try {
        await stopJobOnLocal(job.id, taskId);
        message.success('已发送停止任务信号');
        loadJob();
      } catch (error) {
        message.error(`停止任务失败: ${(error as Error).message}`);
      }
    },
    [job, loadJob],
  );

  useEffect(() => {
    if (!job || (job.status !== 'running' && job.status !== 'pending')) {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
      return;
    }
    pollerRef.current = setInterval(() => {
      loadJob();
    }, 2000);
    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, [job?.status, loadJob]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!job) {
    return <Alert type="error" message="无法加载执行信息" />;
  }

  const tasks = job.tasks || [];
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const failedCount = tasks.filter((t) => t.status === 'failed').length;
  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;

  const collapseItems = tasks.map((task, index) => {
    const cachedDetail = taskDetailCache.get(task.task_index);
    const isLoading = loadingTaskIndex === task.task_index;
    return {
      key: task.id,
      label: (
        <JobTaskLabel
          task={task}
          index={index}
          jobStatus={job.status}
          onStopJob={handleStopJob}
          onStopTask={handleStopTask}
        />
      ),
      children: (
        <JobTaskDetail taskLite={task} taskDetail={cachedDetail ?? null} loading={isLoading} />
      ),
    };
  });

  return (
    <div className="space-y-4">
      {/* Job 概要信息 */}
      <Card
        size="small"
        title={
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold">执行概要</span>
            <StatusPill status={job.status} />
          </div>
        }
        className="!bg-white"
      >
        <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 3 }}>
          <Descriptions.Item label="执行 ID">
            <Text copyable className="ds-text-mono !text-[11px] break-all">
              {job.id}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDateTime(job.created_at)}</Descriptions.Item>
          <Descriptions.Item label="执行耗时">
            {formatDuration(job.started_at, job.completed_at)}
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">{formatDateTime(job.started_at)}</Descriptions.Item>
          <Descriptions.Item label="结束时间">{formatDateTime(job.completed_at)}</Descriptions.Item>
        </Descriptions>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <StatBlock label="任务总数" value={tasks.length} tone="neutral" />
          <StatBlock label="成功" value={completedCount} tone="success" />
          <StatBlock label="失败" value={failedCount} tone="danger" />
          <StatBlock label="执行中" value={runningCount} tone="info" />
          <StatBlock label="等待中" value={pendingCount} tone="neutral" />
        </div>

        {job.error && (
          <Alert type="error" message="执行错误" description={job.error} className="mt-3" showIcon />
        )}
      </Card>

      {/* Job Tasks 列表 */}
      <Card
        size="small"
        title={`任务列表 · ${tasks.length}`}
        className="[&_.ant-card-body]:overflow-auto [&_.ant-card-body]:p-0 sm:[&_.ant-card-body]:max-h-[calc(100vh-380px)]"
      >
        {tasks.length === 0 ? (
          <div className="p-10 text-center text-(--ds-text-tertiary)">暂无任务</div>
        ) : (
          <Collapse
            accordion
            items={collapseItems}
            onChange={handleCollapseChange}
            className="rounded-none border-0 [&_.ant-collapse-content-box]:p-0 [&_.ant-collapse-header]:overflow-hidden [&_.ant-collapse-item:last-child]:border-b-0 [&_.ant-collapse-item]:border-b [&_.ant-collapse-item]:border-b-(--ds-border-soft)"
          />
        )}
      </Card>
    </div>
  );
}

function JobTaskLabel({
  task,
  index,
  jobStatus,
  onStopJob,
  onStopTask,
}: {
  task: JobTaskLite;
  index: number;
  jobStatus: JobStatus;
  onStopJob: () => void;
  onStopTask: (taskId: string) => void;
}) {
  const isRunning = task.status === 'running';
  const jobIsActive = jobStatus === 'running' || jobStatus === 'pending';

  return (
    <div className="flex w-full flex-wrap items-start gap-2 sm:flex-nowrap sm:gap-3">
      <span
        className="ds-text-mono flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold"
        style={{
          background: 'var(--ds-surface-subtle)',
          color: 'var(--ds-text-secondary)',
        }}
      >
        {index + 1}
      </span>
      <StatusPill status={task.status} size="sm" />
      <span className="min-w-0 flex-1 basis-full overflow-hidden text-[13px] leading-relaxed break-all sm:basis-auto">
        <TaskTitleTag title={task.task_title} />
        {task.task_text}
      </span>
      {isRunning && jobIsActive && (
        <span
          className="flex shrink-0 gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Popconfirm
            title="停止当前任务"
            description="仅停止当前正在执行的任务，后续任务继续执行"
            onConfirm={() => onStopTask(task.task_id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              size="small"
              type="text"
              icon={<StopOutlined />}
              className="!text-orange-500 hover:!text-orange-600"
            >
              停止任务
            </Button>
          </Popconfirm>
          <Popconfirm
            title="停止整个执行"
            description="当前任务将失败，剩余所有任务将被跳过"
            onConfirm={onStopJob}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" type="text" danger icon={<StopOutlined />}>
              停止执行
            </Button>
          </Popconfirm>
        </span>
      )}
      {task.started_at && (
        <span
          className="ds-text-mono shrink-0 text-[11px]"
          style={{ color: 'var(--ds-text-tertiary)' }}
        >
          {formatDuration(task.started_at, task.completed_at)}
        </span>
      )}
    </div>
  );
}
