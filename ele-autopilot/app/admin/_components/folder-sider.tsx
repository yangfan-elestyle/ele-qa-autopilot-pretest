import {
  CompressOutlined,
  DeleteOutlined,
  EditOutlined,
  ExpandOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Input, Layout, Tooltip, Tree } from 'antd';
import type { TreeDataNode, TreeProps } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useIsMobile } from '../_hooks/use-is-mobile';
import type { Folder, Id } from '../_types';

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

  const body = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpenOutlined
            style={{
              color: 'var(--ds-brand-600)',
              fontSize: 16,
            }}
          />
          <span className="text-[13px] font-semibold tracking-tight text-(--ds-text-primary)">
            任务目录
          </span>
        </div>
        <span
          className="ds-text-mono rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{
            background: 'var(--ds-surface-subtle)',
            color: 'var(--ds-text-tertiary)',
          }}
        >
          {totalFolders}
        </span>
      </div>

      <Input
        allowClear
        placeholder="搜索路径名称"
        value={treeSearch}
        onChange={(e) => onTreeSearchChange(e.target.value)}
        className="shrink-0"
      />

      <div className="flex shrink-0 gap-2">
        <Button
          type="primary"
          icon={<FolderAddOutlined />}
          onClick={onCreateRoot}
          className="flex-1"
        >
          新建路径
        </Button>
        <Tooltip title="展开全部">
          <Button
            icon={<ExpandOutlined />}
            onClick={() => onExpand(Array.from(folderById.keys()))}
            aria-label="展开全部"
          />
        </Tooltip>
        <Tooltip title="折叠全部">
          <Button
            icon={<CompressOutlined />}
            onClick={() => onExpand([])}
            aria-label="折叠全部"
          />
        </Tooltip>
      </div>

      <div
        className="min-h-0 flex-1 overflow-auto rounded-lg pr-1 pt-1"
        style={{ background: 'transparent' }}
      >
        {treeData.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 py-12 text-center"
            style={{ color: 'var(--ds-text-tertiary)' }}
          >
            <FolderOpenOutlined style={{ fontSize: 28, opacity: 0.6 }} />
            <div className="text-xs">
              {treeSearch.trim() ? '没有匹配的路径' : '暂无路径，点击「新建路径」开始'}
            </div>
          </div>
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
                <span className="group/node relative flex min-h-[28px] w-full items-center pr-1">
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    {resolvedTitle as React.ReactNode}
                  </span>
                  <span
                    className="ml-2 inline-flex shrink-0 items-center gap-0.5 rounded-md px-1 opacity-0 transition-opacity group-hover/node:opacity-100"
                    style={{
                      background: 'var(--ds-surface-elevated)',
                      boxShadow: 'var(--ds-shadow-xs)',
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
              );
            }}
            className="[&_.ant-tree-indent-unit]:w-3 [&_.ant-tree-switcher]:mr-0"
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
