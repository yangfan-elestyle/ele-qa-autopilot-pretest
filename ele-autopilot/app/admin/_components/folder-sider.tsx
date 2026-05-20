import {
  CompressOutlined,
  DeleteOutlined,
  EditOutlined,
  ExpandOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Input, Layout, Tooltip, Tree } from 'antd';
import type { TreeDataNode, TreeProps } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useIsMobile } from '../_hooks/use-is-mobile';
import type { Folder, Id } from '../_types';
import EmptyState from './empty-state';

const MIN_WIDTH = 240;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 296;

type FolderSiderProps = {
  treeSearch: string;
  onTreeSearchChange: (value: string) => void;
  treeData: TreeDataNode[];
  selectedFolderId: Id | null;
  expandedKeys: React.Key[];
  autoExpandParent: boolean;
  onExpand: (keys: React.Key[]) => void;
  onSelect: (folderId: Id | null) => void;
  folderById: Map<Id, Folder>;
  onCreateRoot: () => void;
  onCreateChild: (folderId: Id) => void;
  onRename: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  onDrop: TreeProps['onDrop'];
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

export default function FolderSider({
  treeSearch,
  onTreeSearchChange,
  treeData,
  selectedFolderId,
  expandedKeys,
  autoExpandParent,
  onExpand,
  onSelect,
  folderById,
  onCreateRoot,
  onCreateChild,
  onRename,
  onDelete,
  onDrop,
  mobileOpen = false,
  onMobileOpenChange,
}: FolderSiderProps) {
  const { Sider } = Layout;
  const isMobile = useIsMobile();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleSelect = (id: Id | null) => {
    onSelect(id);
    if (isMobile && id != null) onMobileOpenChange?.(false);
  };

  const totalFolders = folderById.size;
  const totalTasks = useMemo(() => {
    let n = 0;
    for (const f of folderById.values()) n += f.task_count ?? 0;
    return n;
  }, [folderById]);

  const body = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            style={{
              background: 'var(--ds-brand-50)',
              color: 'var(--ds-brand-600)',
              boxShadow: 'inset 0 0 0 1px rgba(99, 102, 241, 0.18)',
            }}
          >
            <FolderOpenOutlined style={{ fontSize: 14 }} />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[13px] font-semibold tracking-tight text-(--ds-text-primary)">
              任务目录
            </span>
            <span
              className="ds-text-mono text-[10.5px]"
              style={{ color: 'var(--ds-text-tertiary)' }}
            >
              {totalFolders} 路径 · {totalTasks} 任务
            </span>
          </span>
        </div>
        <div className="inline-flex items-center gap-0.5">
          <Tooltip title="展开全部">
            <Button
              size="small"
              type="text"
              icon={<ExpandOutlined />}
              onClick={() => onExpand(Array.from(folderById.keys()))}
              aria-label="展开全部"
              className="!h-7 !w-7"
            />
          </Tooltip>
          <Tooltip title="折叠全部">
            <Button
              size="small"
              type="text"
              icon={<CompressOutlined />}
              onClick={() => onExpand([])}
              aria-label="折叠全部"
              className="!h-7 !w-7"
            />
          </Tooltip>
        </div>
      </div>

      <Input
        allowClear
        placeholder="搜索路径名称"
        prefix={<SearchOutlined className="text-(--ds-text-tertiary)" />}
        value={treeSearch}
        onChange={(e) => onTreeSearchChange(e.target.value)}
        className="shrink-0"
      />

      <Button type="primary" icon={<FolderAddOutlined />} onClick={onCreateRoot} block>
        新建路径
      </Button>

      <div
        className="min-h-0 flex-1 overflow-auto rounded-lg pt-1 pr-1"
        style={{ background: 'transparent' }}
      >
        {treeData.length === 0 ? (
          <EmptyState
            icon={<FolderOpenOutlined />}
            title={treeSearch.trim() ? '没有匹配的路径' : '还没有任务路径'}
            description={
              treeSearch.trim()
                ? '换个关键词，或清空搜索查看全部。'
                : '路径用于把任务分组管理，点击下方按钮开始建一个。'
            }
            action={
              treeSearch.trim() ? null : (
                <Button
                  type="primary"
                  size="small"
                  icon={<FolderAddOutlined />}
                  onClick={onCreateRoot}
                >
                  新建路径
                </Button>
              )
            }
            size="sm"
            tone="brand"
          />
        ) : (
          <Tree
            showLine={{ showLeafIcon: false }}
            blockNode
            draggable={{ icon: false, nodeDraggable: () => true }}
            onDrop={onDrop}
            selectedKeys={selectedFolderId ? [selectedFolderId] : []}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            onExpand={(keys) => onExpand(keys)}
            treeData={treeData}
            onSelect={(keys) => {
              if (keys.length === 0) return;
              const key = keys[0];
              handleSelect(typeof key === 'string' ? key : String(key));
            }}
            titleRender={(node) => {
              const resolvedTitle = (() => {
                const title = node.title;
                return typeof title === 'function' ? title(node) : title;
              })();
              const folderId = typeof node.key === 'string' ? node.key : String(node.key);
              const folder = folderById.get(folderId);
              if (!folder) return resolvedTitle;
              return (
                <Tooltip
                  title={folder.name}
                  placement="right"
                  mouseEnterDelay={0.4}
                  destroyTooltipOnHide
                >
                  <span className="group/node relative flex min-h-[28px] w-full items-center whitespace-nowrap">
                    <span className="text-[13px]">{resolvedTitle as React.ReactNode}</span>
                    <span
                      className="sticky right-0 ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-md px-1 opacity-0 transition-opacity group-hover/node:opacity-100"
                      style={{
                        background: 'var(--ds-surface-elevated)',
                        boxShadow: 'var(--ds-shadow-xs)',
                        zIndex: 1,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip title="新建子路径">
                        <Button
                          size="small"
                          type="text"
                          className="!h-6 !w-6 !min-w-0 !p-0"
                          icon={<PlusOutlined className="!text-[12px]" />}
                          onClick={() => onCreateChild(folder.id)}
                        />
                      </Tooltip>
                      <Tooltip title="重命名">
                        <Button
                          size="small"
                          type="text"
                          className="!h-6 !w-6 !min-w-0 !p-0"
                          icon={<EditOutlined className="!text-[12px]" />}
                          onClick={() => onRename(folder)}
                        />
                      </Tooltip>
                      <Tooltip title="删除">
                        <Button
                          size="small"
                          type="text"
                          danger
                          className="!h-6 !w-6 !min-w-0 !p-0"
                          icon={<DeleteOutlined className="!text-[12px]" />}
                          onClick={() => void onDelete(folder)}
                        />
                      </Tooltip>
                    </span>
                  </span>
                </Tooltip>
              );
            }}
            className="[&_.ant-tree-indent-unit]:w-3 [&_.ant-tree-list-holder-inner]:!w-max [&_.ant-tree-list-holder-inner]:!min-w-full [&_.ant-tree-node-content-wrapper]:!w-full [&_.ant-tree-switcher]:mr-0 [&_.ant-tree-treenode]:!w-full"
            style={{ background: 'transparent' }}
          />
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        open={mobileOpen}
        onClose={() => onMobileOpenChange?.(false)}
        placement="left"
        width="85vw"
        title="任务目录"
        styles={{ body: { padding: 16 } }}
      >
        {body}
      </Drawer>
    );
  }

  return (
    <Sider
      width={width}
      theme="light"
      className="relative"
      style={{
        background: 'var(--ds-surface-elevated)',
        borderRight: '1px solid var(--ds-border-soft)',
        padding: '16px',
      }}
    >
      {body}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize transition-colors hover:bg-(--ds-brand-200)"
        aria-hidden="true"
      />
    </Sider>
  );
}
