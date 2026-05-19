import {
  BranchesOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MenuOutlined,
  OrderedListOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Empty, Input, Layout, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Folder, Id, Task, TaskJobStats } from '../_types';
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

function StatChip({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'neutral' | 'success' | 'danger' | 'info';
}) {
  const toneMap: Record<typeof tone, { color: string; bg: string }> = {
    neutral: { color: '#475569', bg: 'rgba(148, 163, 184, 0.14)' },
    success: { color: '#15803d', bg: 'rgba(22, 163, 74, 0.12)' },
    danger: { color: '#b91c1c', bg: 'rgba(220, 38, 38, 0.1)' },
    info: { color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)' },
  };
  const t = toneMap[tone];
  return (
    <Tooltip title={label}>
      <span
        className="ds-text-mono inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
        style={{ color: t.color, background: t.bg }}
      >
        {value}
      </span>
    </Tooltip>
  );
}

function JobStatsDisplay({ stats }: { stats: TaskJobStats | undefined }) {
  if (!stats || stats.total === 0) {
    return <span className="text-xs text-(--ant-color-text-tertiary)">-</span>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      <StatChip value={stats.total} label="总数" tone="neutral" />
      <StatChip value={stats.completed} label="成功" tone="success" />
      <StatChip value={stats.failed} label="失败" tone="danger" />
      <StatChip value={stats.running + stats.pending} label="进行中" tone="info" />
    </span>
  );
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
  const columns: ColumnsType<Task> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 96,
      responsive: ['md'],
      render: (id: Id) => (
        <Tooltip title={id}>
          <span className="ds-text-mono text-[11px] text-(--ant-color-text-tertiary)">
            {id.slice(0, 8)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '任务内容',
      dataIndex: 'text',
      ellipsis: true,
      render: (value: string, record) => (
        <div
          className="-mx-1 max-h-44 cursor-text overflow-auto rounded-md px-1 py-0.5 text-[13px] leading-relaxed break-all whitespace-pre-wrap text-(--ds-text-primary) transition-colors hover:bg-(--ds-brand-50)"
          title={value}
          onClick={(e) => {
            e.stopPropagation();
            onEditTask(record);
          }}
        >
          <TaskTitleTag title={record.title} />
          {value}
        </div>
      ),
    },
    {
      title: (
        <Tooltip title="总数 / 成功 / 失败 / 进行中">
          <span>执行统计</span>
        </Tooltip>
      ),
      key: 'stats',
      width: 200,
      align: 'center',
      responsive: ['sm'],
      render: (_: unknown, record) => <JobStatsDisplay stats={taskStats[record.id]} />,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      align: 'right',
      render: (_: unknown, record) => (
        <div
          className="flex flex-wrap items-center justify-end gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title="执行">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => onExecuteTask(record)}
              className="!h-8 !w-8 hover:!text-(--ds-brand-600)"
            />
          </Tooltip>
          <Tooltip title="预览历史">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => window.open(`/autopilot/preview/${record.id}`, '_blank')}
              className="!h-8 !w-8"
            />
          </Tooltip>
          {record.sub_ids && record.sub_ids.length > 0 && (
            <Tooltip title="任务链">
              <Button
                type="text"
                icon={<BranchesOutlined />}
                onClick={() => onViewTaskChain(record)}
                className="!h-8 !w-8"
              />
            </Tooltip>
          )}
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEditTask(record)}
              className="!h-8 !w-8"
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => void onDeleteTasks([record.id])}
              className="!h-8 !w-8"
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  const { Content } = Layout;
  const folderName = selectedFolder?.name ?? '未选择路径';
  const taskCount = tasks.length;

  return (
    <Content className="flex min-h-0 flex-col overflow-hidden p-3 sm:p-6">
      {/* Page header */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <nav
              className="flex items-center gap-1 text-[12px] text-(--ds-text-tertiary)"
              aria-label="breadcrumb"
            >
              <span>任务工作台</span>
              <RightOutlined style={{ fontSize: 9 }} />
              <span className="text-(--ds-text-secondary)">{folderName}</span>
            </nav>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="m-0 truncate text-[18px] font-semibold tracking-tight text-(--ds-text-primary)">
                {selectedFolder ? selectedFolder.name : '任务列表'}
              </h1>
              <span
                className="ds-text-mono rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  background: 'var(--ds-surface-subtle)',
                  color: 'var(--ds-text-tertiary)',
                }}
              >
                {taskCount} 条
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showMobileMenu && (
              <Button icon={<MenuOutlined />} onClick={onOpenMobileMenu}>
                目录
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={onRefresh} aria-label="刷新">
              刷新
            </Button>
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

        <div className="mt-3">
          <Input
            allowClear
            prefix={<SearchOutlined className="text-(--ds-text-tertiary)" />}
            placeholder="按任务内容搜索..."
            value={taskSearch}
            onChange={(e) => onTaskSearchChange(e.target.value)}
            className="w-full sm:max-w-md"
          />
        </div>
      </div>

      {/* Surface card */}
      <div className="ds-surface-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <Table<Task>
            rowKey="id"
            loading={loading}
            dataSource={tasks}
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
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText: (
                <div className="py-12">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <div className="text-(--ds-text-tertiary)">
                        {taskSearch.trim() ? (
                          '没有匹配的任务'
                        ) : (
                          <>
                            <div className="mb-2">当前路径下还没有任务</div>
                            <Button
                              type="primary"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={onCreateTask}
                            >
                              新建任务
                            </Button>
                          </>
                        )}
                      </div>
                    }
                  />
                </div>
              ),
            }}
          />
        </div>
      </div>
    </Content>
  );
}
