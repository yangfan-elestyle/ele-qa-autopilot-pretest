import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  HourglassOutlined,
  LoadingOutlined,
  StopOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
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

import MetricTile from '../../_components/metric-tile';
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

function computeProgressPct(stats: {
  total: number;
  done: number;
}): number {
  if (stats.total === 0) return 0;
  return Math.round((stats.done / stats.total) * 100);
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

  const doneCount = completedCount + failedCount;
  const progressPct = computeProgressPct({ total: tasks.length, done: doneCount });

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
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5 lg:gap-3">
          <MetricTile
            label="任务总数"
            value={tasks.length}
            hint={
              tasks.length > 0
                ? `${doneCount} / ${tasks.length} 已完成 · ${progressPct}%`
                : '—'
            }
            tone="neutral"
            icon={<UnorderedListOutlined />}
          />
          <MetricTile
            label="成功"
            value={completedCount}
            hint={tasks.length > 0 ? `占 ${Math.round((completedCount / tasks.length) * 100)}%` : '—'}
            tone={completedCount > 0 ? 'success' : 'neutral'}
            icon={<CheckCircleOutlined />}
          />
          <MetricTile
            label="失败"
            value={failedCount}
            hint={failedCount === 0 ? '健康' : `占 ${Math.round((failedCount / tasks.length) * 100)}%`}
            tone={failedCount > 0 ? 'danger' : 'neutral'}
            icon={<CloseCircleOutlined />}
          />
          <MetricTile
            label="执行中"
            value={runningCount}
            hint={runningCount > 0 ? '正在执行' : '空闲'}
            tone={runningCount > 0 ? 'info' : 'neutral'}
            icon={runningCount > 0 ? <LoadingOutlined /> : <ClockCircleOutlined />}
          />
          <MetricTile
            label="等待中"
            value={pendingCount}
            hint={pendingCount > 0 ? '队列排队' : '—'}
            tone={pendingCount > 0 ? 'warning' : 'neutral'}
            icon={<HourglassOutlined />}
          />
        </div>

        {tasks.length > 0 && (
          <div className="mb-3">
            <div
              className="flex items-center justify-between text-[11px] font-medium"
              style={{ color: 'var(--ds-text-tertiary)' }}
            >
              <span className="tracking-wide uppercase">执行进度</span>
              <span className="ds-text-mono">{progressPct}%</span>
            </div>
            <div
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--ds-surface-subtle)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progressPct}%`,
                  background:
                    failedCount > 0
                      ? 'linear-gradient(90deg, #16a34a 0%, #16a34a ' +
                        Math.max(0, progressPct - (failedCount / tasks.length) * 100) +
                        '%, #dc2626 100%)'
                      : 'linear-gradient(90deg, var(--ds-brand-500), var(--ds-brand-700))',
                }}
              />
            </div>
          </div>
        )}

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

        {job.error && (
          <Alert type="error" message="执行错误" description={job.error} className="mt-3" showIcon />
        )}
      </Card>

      {/* Job Tasks 列表 */}
      <Card
        size="small"
        title={`任务列表 · ${tasks.length}`}
        className="[&_.ant-card-body]:p-0 md:[&_.ant-card-body]:max-h-[calc(100vh-380px)] md:[&_.ant-card-body]:overflow-auto"
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
      <span className="ds-num-square ds-num-square-neutral">{index + 1}</span>
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
