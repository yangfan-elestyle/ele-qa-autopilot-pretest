import {
  BranchesOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  LoadingOutlined,
  MenuOutlined,
  MoreOutlined,
  OrderedListOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Input, Layout, Popconfirm, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { useMemo, useState } from 'react';

import type { Folder, Id, Task, TaskJobStats } from '../_types';
import EmptyState from './empty-state';
import MetricTile from './metric-tile';
import TableSkeleton from './table-skeleton';
import SourceTag from './source-tag';
import TaskTitleTag from './task-title-tag';

type TaskContentProps = {
  tasks: Task[];
  loading: boolean;
  selectedFolder: Folder | null;
  selectedTaskIds: Id[];
  taskSearch: string;
  taskStats: Record<Id, TaskJobStats>;
  onTaskSearchChange: (value: string) => void;
  onCreateTask: () => void;
  onDeleteTasks: (ids: Id[]) => void;
  onEditTask: (task: Task) => void;
  onRefresh: () => void;
  onSelectionChange: (ids: Id[]) => void;
  onOpenSelectedTasks: () => void;
  onViewTaskChain: (task: Task) => void;
  onExecuteTask: (task: Task) => void;
  showMobileMenu?: boolean;
  onOpenMobileMenu?: () => void;
};

type ViewFilter = 'all' | 'idle' | 'active' | 'failed';

function StatChip({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'neutral' | 'success' | 'danger' | 'info';
}) {
  return (
    <Tooltip title={label}>
      <span className={`ds-chip ds-chip-${tone} ds-text-mono`}>{value}</span>
    </Tooltip>
  );
}

function JobStatsDisplay({ stats }: { stats: TaskJobStats | undefined }) {
  if (!stats || stats.total === 0) {
    return (
      <span className="text-[11px] tracking-wide text-(--ds-text-tertiary) uppercase">
        未运行
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <StatChip value={stats.total} label="总数" tone="neutral" />
      <StatChip value={stats.completed} label="成功" tone="success" />
      <StatChip value={stats.failed} label="失败" tone="danger" />
      {stats.running + stats.pending > 0 && (
        <StatChip value={stats.running + stats.pending} label="进行中" tone="info" />
      )}
    </span>
  );
}

function classifyTask(stats: TaskJobStats | undefined): ViewFilter[] {
  const tags: ViewFilter[] = ['all'];
  if (!stats || stats.total === 0) {
    tags.push('idle');
    return tags;
  }
  if (stats.running + stats.pending > 0) tags.push('active');
  if (stats.failed > 0) tags.push('failed');
  return tags;
}

export default function TaskContent({
  tasks,
  loading,
  selectedFolder,
  selectedTaskIds,
  taskSearch,
  taskStats,
  onTaskSearchChange,
  onCreateTask,
  onDeleteTasks,
  onEditTask,
  onRefresh,
  onSelectionChange,
  onOpenSelectedTasks,
  onViewTaskChain,
  onExecuteTask,
  showMobileMenu = false,
  onOpenMobileMenu,
}: TaskContentProps) {
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');

  const aggregate = useMemo(() => {
    let total = 0;
    let completed = 0;
    let failed = 0;
    let active = 0;
    let executed = 0;
    let idle = 0;
    for (const t of tasks) {
      const s = taskStats[t.id];
      if (!s || s.total === 0) {
        idle += 1;
        continue;
      }
      total += s.total;
      completed += s.completed;
      failed += s.failed;
      active += s.running + s.pending;
      executed += 1;
    }
    const finished = completed + failed;
    const successRate = finished > 0 ? Math.round((completed / finished) * 100) : null;
    return { total, completed, failed, active, executed, idle, successRate };
  }, [tasks, taskStats]);

  const failedTaskCount = useMemo(
    () => tasks.filter((t) => (taskStats[t.id]?.failed ?? 0) > 0).length,
    [tasks, taskStats],
  );
  const activeTaskCount = useMemo(
    () =>
      tasks.filter(
        (t) => (taskStats[t.id]?.running ?? 0) + (taskStats[t.id]?.pending ?? 0) > 0,
      ).length,
    [tasks, taskStats],
  );

  const filteredTasks = useMemo(() => {
    if (viewFilter === 'all') return tasks;
    return tasks.filter((t) => classifyTask(taskStats[t.id]).includes(viewFilter));
  }, [tasks, taskStats, viewFilter]);

  const columns: ColumnsType<Task> = [
    {
      title: '任务内容',
      dataIndex: 'text',
      ellipsis: false,
      render: (value: string, record) => (
        <div
          className="ds-task-row-hover-target -mx-1 cursor-text rounded-md px-1 py-0.5 transition-colors"
          title={value}
          onClick={(e) => {
            e.stopPropagation();
            onEditTask(record);
          }}
        >
          <SourceTag source={record.source} />
          <TaskTitleTag title={record.title} />
          <div className="ds-task-row-text">{value}</div>
          <div className="ds-task-row-meta">
            <span className="ds-text-mono opacity-70" title={record.id}>
              #{record.id.slice(0, 8)}
            </span>
            {record.sub_ids && record.sub_ids.length > 0 && (
              <>
                <span className="opacity-30">·</span>
                <span className="inline-flex items-center gap-1">
                  <BranchesOutlined style={{ fontSize: 10 }} />
                  任务链 {record.sub_ids.length}
                </span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      title: (
        <Tooltip title="总数 / 成功 / 失败 / 进行中">
          <span className="tracking-wide">执行统计</span>
        </Tooltip>
      ),
      key: 'stats',
      width: 220,
      align: 'center',
      responsive: ['sm'],
      render: (_: unknown, record) => <JobStatsDisplay stats={taskStats[record.id]} />,
    },
    {
      title: <span className="tracking-wide">操作</span>,
      key: 'actions',
      width: 140,
      align: 'right',
      render: (_: unknown, record) => (
        <TaskRowActions
          record={record}
          onExecuteTask={onExecuteTask}
          onEditTask={onEditTask}
          onViewTaskChain={onViewTaskChain}
          onDeleteTasks={onDeleteTasks}
        />
      ),
    },
  ];

  const { Content } = Layout;
  const folderName = selectedFolder?.name ?? '未选择路径';
  const taskCount = tasks.length;

  return (
    <Content className="flex min-h-0 flex-col overflow-hidden p-3 sm:p-6">
      {/* Page header */}
      <div className="ds-page-header mb-4 flex-shrink-0">
        <div className="ds-page-header-row">
          <div className="min-w-0 flex-1">
            <nav className="ds-page-breadcrumb" aria-label="breadcrumb">
              <span>任务工作台</span>
              <RightOutlined className="ds-page-breadcrumb-sep" />
              <span className="ds-page-breadcrumb-current truncate">{folderName}</span>
            </nav>
            <div className="mt-1.5 flex items-center gap-2.5">
              <h1 className="ds-page-title truncate">
                {selectedFolder ? selectedFolder.name : '任务列表'}
              </h1>
              <span className="ds-chip ds-chip-neutral ds-text-mono">{taskCount} 条</span>
              {activeTaskCount > 0 && (
                <Tooltip title={`${activeTaskCount} 条任务有正在执行的 job`}>
                  <span className="ds-chip ds-chip-info ds-text-mono">
                    <LoadingOutlined spin className="!mr-1 text-[10px]" />
                    {activeTaskCount}
                  </span>
                </Tooltip>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showMobileMenu && (
              <Button icon={<MenuOutlined />} onClick={onOpenMobileMenu}>
                目录
              </Button>
            )}
            <Tooltip title="刷新当前路径的任务">
              <Button icon={<ReloadOutlined />} onClick={onRefresh} aria-label="刷新" />
            </Tooltip>
            <Button
              icon={<OrderedListOutlined />}
              disabled={selectedTaskIds.length === 0}
              onClick={onOpenSelectedTasks}
            >
              已选 {selectedTaskIds.length}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreateTask}>
              新建任务
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            allowClear
            prefix={<SearchOutlined className="text-(--ds-text-tertiary)" />}
            placeholder="按任务内容或标题搜索"
            value={taskSearch}
            onChange={(e) => onTaskSearchChange(e.target.value)}
            className="min-w-0 flex-1 sm:min-w-[200px] sm:max-w-md"
          />
          <div
            className="ds-segmented"
            role="tablist"
            aria-label="按状态筛选任务"
          >
            <SegmentBtn
              active={viewFilter === 'all'}
              onClick={() => setViewFilter('all')}
              label="全部"
              count={taskCount}
            />
            <SegmentBtn
              active={viewFilter === 'idle'}
              onClick={() => setViewFilter('idle')}
              label="未运行"
              count={aggregate.idle}
            />
            <SegmentBtn
              active={viewFilter === 'active'}
              onClick={() => setViewFilter('active')}
              label="进行中"
              count={activeTaskCount}
              tone="info"
            />
            <SegmentBtn
              active={viewFilter === 'failed'}
              onClick={() => setViewFilter('failed')}
              label="有失败"
              count={failedTaskCount}
              tone="danger"
            />
          </div>
        </div>
      </div>

      {/* KPI strip */}
      {selectedFolder && (
        <div className="mb-4 grid flex-shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
          <MetricTile
            label="任务总数"
            value={taskCount}
            hint={
              aggregate.executed
                ? `${aggregate.executed} 已运行 · ${aggregate.idle} 待执行`
                : taskCount === 0
                  ? '尚无任务'
                  : '尚未运行'
            }
            tone="neutral"
            icon={<FileTextOutlined />}
          />
          <MetricTile
            label="成功率"
            value={aggregate.successRate == null ? '—' : `${aggregate.successRate}%`}
            hint={
              aggregate.completed + aggregate.failed > 0
                ? `跨 ${aggregate.total} 次执行`
                : '暂无完成记录'
            }
            tone={
              aggregate.successRate == null
                ? 'neutral'
                : aggregate.successRate >= 80
                  ? 'success'
                  : aggregate.successRate >= 50
                    ? 'warning'
                    : 'danger'
            }
            icon={<CheckCircleOutlined />}
          />
          <MetricTile
            label="进行中"
            value={aggregate.active}
            hint={aggregate.active > 0 ? '执行 / 排队中' : '当前空闲'}
            tone={aggregate.active > 0 ? 'info' : 'neutral'}
            icon={aggregate.active > 0 ? <LoadingOutlined /> : <CheckCircleOutlined />}
          />
          <MetricTile
            label="失败累计"
            value={aggregate.failed}
            hint={
              aggregate.failed === 0
                ? '健康'
                : aggregate.total > 0
                  ? `占 ${Math.round((aggregate.failed / aggregate.total) * 100)}% · ${failedTaskCount} 任务`
                  : ''
            }
            tone={aggregate.failed === 0 ? 'neutral' : 'danger'}
            icon={<CloseCircleOutlined />}
          />
        </div>
      )}

      {/* Surface card */}
      <div className="ds-section flex min-h-0 flex-1 flex-col">
        <div className="ds-section-body">
          {loading && tasks.length === 0 ? (
            <TableSkeleton rows={8} columns={3} />
          ) : (
            <Table<Task>
              rowKey="id"
              loading={loading && tasks.length > 0 ? { indicator: <LoadingOutlined spin /> } : false}
              dataSource={filteredTasks}
              columns={columns}
              pagination={false}
              rowSelection={{
                selectedRowKeys: selectedTaskIds,
                preserveSelectedRowKeys: true,
                onChange: (keys) => onSelectionChange(keys as Id[]),
                columnWidth: 48,
              }}
              onRow={(record) => ({
                onClick: () => window.open(`/autopilot/preview/${record.id}`, '_blank'),
                className: 'cursor-pointer',
              })}
              size="middle"
              tableLayout="fixed"
              scroll={{ x: 'max-content' }}
              locale={{
                emptyText: (
                  <EmptyState
                    icon={<FileTextOutlined />}
                    title={
                      taskSearch.trim()
                        ? '没有匹配的任务'
                        : viewFilter !== 'all'
                          ? '当前筛选下无任务'
                          : selectedFolder
                            ? '当前路径下还没有任务'
                            : '请先在左侧选择一个路径'
                    }
                    description={
                      taskSearch.trim()
                        ? '换一个关键词，或清空搜索条件查看全部任务。'
                        : viewFilter !== 'all'
                          ? '切换到"全部"以查看其它状态任务，或先派单执行已有任务。'
                          : selectedFolder
                            ? '在这里编排测试任务，可分批 +++ 创建，亦可派单本地 agent 执行。'
                            : '选择左侧任意路径以查看与新建任务。'
                    }
                    action={
                      selectedFolder && !taskSearch.trim() && viewFilter === 'all' ? (
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={onCreateTask}
                        >
                          新建任务
                        </Button>
                      ) : viewFilter !== 'all' ? (
                        <Button onClick={() => setViewFilter('all')}>查看全部</Button>
                      ) : null
                    }
                    size="md"
                  />
                ),
              }}
            />
          )}
        </div>
      </div>
    </Content>
  );
}

function TaskRowActions({
  record,
  onExecuteTask,
  onEditTask,
  onViewTaskChain,
  onDeleteTasks,
}: {
  record: Task;
  onExecuteTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onViewTaskChain: (task: Task) => void;
  onDeleteTasks: (ids: Id[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasChain = !!record.sub_ids && record.sub_ids.length > 0;

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑任务',
      onClick: () => onEditTask(record),
    },
    ...(hasChain
      ? [
          {
            key: 'chain',
            icon: <BranchesOutlined />,
            label: `查看任务链 (${record.sub_ids!.length})`,
            onClick: () => onViewTaskChain(record),
          },
        ]
      : []),
    { type: 'divider' as const },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除任务',
      danger: true,
      onClick: () => {
        setOpen(false);
        setConfirmOpen(true);
      },
    },
  ];

  return (
    <div
      className="ds-row-actions"
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip title="派单执行">
        <Button
          type="text"
          icon={<PlayCircleOutlined />}
          onClick={() => onExecuteTask(record)}
          className="ds-row-action-btn ds-row-action-btn--primary"
          aria-label="派单执行"
        />
      </Tooltip>
      <Tooltip title="预览执行历史">
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => window.open(`/autopilot/preview/${record.id}`, '_blank')}
          className="ds-row-action-btn"
          aria-label="预览执行历史"
        />
      </Tooltip>
      <Popconfirm
        title="删除任务"
        description="此操作不可撤销，确认删除？"
        open={confirmOpen}
        okText="删除"
        okButtonProps={{ danger: true }}
        cancelText="取消"
        placement="topRight"
        onConfirm={() => {
          setConfirmOpen(false);
          void onDeleteTasks([record.id]);
        }}
        onCancel={() => setConfirmOpen(false)}
      >
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          placement="bottomRight"
          open={open}
          onOpenChange={setOpen}
        >
          <Tooltip title="更多操作" mouseEnterDelay={0.4}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              className="ds-row-action-btn"
              aria-label="更多操作"
            />
          </Tooltip>
        </Dropdown>
      </Popconfirm>
    </div>
  );
}

function SegmentBtn({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: 'info' | 'danger';
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`ds-segmented-btn ${active ? 'ds-segmented-btn--active' : ''}`}
    >
      <span>{label}</span>
      <span
        className="ds-segmented-btn-count"
        style={
          !active && tone === 'danger' && count > 0
            ? { background: 'rgba(220, 38, 38, 0.1)', color: '#b91c1c' }
            : !active && tone === 'info' && count > 0
              ? { background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }
              : undefined
        }
      >
        {count}
      </span>
    </button>
  );
}
