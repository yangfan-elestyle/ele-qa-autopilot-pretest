import { DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { Button, Drawer, Empty, Modal, Typography } from 'antd';
import { useMemo, useState } from 'react';

import type { Folder, Id, Task } from '../_types';
import SourceTag from './source-tag';
import TaskTitleTag from './task-title-tag';

type SelectedTasksDrawerProps = {
  open: boolean;
  onClose: () => void;
  selectedTaskIds: Id[];
  selectedTasksById: Record<Id, Task>;
  folderById: Map<Id, Folder>;
  onReorder?: (ids: Id[]) => void;
  onRemove?: (id: Id) => void;
  onClear?: () => void;
  onCreateTaskChain?: () => void;
  title?: string;
  readonly?: boolean;
};

function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number) {
  const next = arr.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export default function SelectedTasksDrawer({
  open,
  onClose,
  selectedTaskIds,
  selectedTasksById,
  folderById,
  onReorder,
  onRemove,
  onClear,
  onCreateTaskChain,
  title,
  readonly = false,
}: SelectedTasksDrawerProps) {
  const [draggingId, setDraggingId] = useState<Id | null>(null);
  const [dragOverId, setDragOverId] = useState<Id | null>(null);

  const selectedTasks = useMemo(
    () => selectedTaskIds.map((id) => selectedTasksById[id]).filter((t): t is Task => Boolean(t)),
    [selectedTaskIds, selectedTasksById],
  );

  function reorder(fromId: Id, toId: Id) {
    if (fromId === toId || !onReorder) return;
    const fromIndex = selectedTaskIds.indexOf(fromId);
    const toIndex = selectedTaskIds.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0) return;
    onReorder(arrayMove(selectedTaskIds, fromIndex, toIndex));
  }

  function confirmClear() {
    if (!selectedTaskIds.length || !onClear) return;
    Modal.confirm({
      title: '清空已选任务？',
      content: '这只会清空当前选择，不会删除任务本身。',
      okText: '清空',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk() {
        onClear();
      },
    });
  }

  const resolvedTitle = title ?? `已选任务 · ${selectedTaskIds.length}`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={resolvedTitle}
      width="min(760px, 100%)"
      footer={
        readonly ? null : (
          <div className="flex w-full items-center justify-between">
            <Button danger disabled={!selectedTaskIds.length} onClick={confirmClear}>
              清空选择
            </Button>
            <Button type="primary" disabled={!selectedTaskIds.length} onClick={onCreateTaskChain}>
              创建任务链
            </Button>
          </div>
        )
      }
    >
      {selectedTasks.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <Empty description={<span className="text-(--ds-text-tertiary)">暂无已选任务</span>} />
        </div>
      ) : (
        <div className="space-y-2">
          {!readonly && (
            <div className="ds-banner ds-banner-info mb-3">
              拖动可排序，创建任务链时将按当前顺序处理。
            </div>
          )}

          {selectedTasks.map((task, index) => {
            const folderName = folderById.get(task.folder_id)?.name ?? '未知路径';
            const dragging = draggingId === task.id;
            const over = dragOverId === task.id;

            return (
              <div
                key={task.id}
                draggable={!readonly}
                onDragStart={
                  readonly
                    ? undefined
                    : (e) => {
                        setDraggingId(task.id);
                        setDragOverId(task.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', task.id);
                      }
                }
                onDragOver={
                  readonly
                    ? undefined
                    : (e) => {
                        e.preventDefault();
                        if (dragOverId !== task.id) setDragOverId(task.id);
                      }
                }
                onDrop={
                  readonly
                    ? undefined
                    : (e) => {
                        e.preventDefault();
                        const from = draggingId ?? e.dataTransfer.getData('text/plain');
                        if (from) reorder(from, task.id);
                        setDraggingId(null);
                        setDragOverId(null);
                      }
                }
                onDragEnd={
                  readonly
                    ? undefined
                    : () => {
                        setDraggingId(null);
                        setDragOverId(null);
                      }
                }
                className={`ds-dnd-item flex flex-wrap items-start gap-3 px-3 py-2.5 sm:flex-nowrap ${
                  over ? 'ds-dnd-item-over' : ''
                } ${dragging ? 'ds-dnd-item-dragging' : ''}`}
              >
                <span className="ds-num-square ds-num-square-brand">{index + 1}</span>
                {!readonly && (
                  <span className="shrink-0 cursor-grab pt-1 text-(--ds-text-tertiary) active:cursor-grabbing">
                    <HolderOutlined />
                  </span>
                )}

                <div className="min-w-0 flex-1 basis-full sm:basis-0">
                  <Typography.Paragraph
                    ellipsis={{ rows: 3, tooltip: task.text }}
                    className="!mb-0 !text-[13px] leading-relaxed"
                  >
                    <SourceTag source={task.source} />
                    <TaskTitleTag title={task.title} />
                    {task.text}
                  </Typography.Paragraph>
                  <div
                    className="mt-1 truncate text-[11px]"
                    style={{ color: 'var(--ds-text-tertiary)' }}
                    title={folderName}
                  >
                    路径：{folderName}
                  </div>
                </div>

                {!readonly && onRemove && (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => onRemove(task.id)}
                    aria-label="移除"
                    className="shrink-0"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}
