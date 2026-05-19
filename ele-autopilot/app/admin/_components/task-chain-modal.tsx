import { Form, Input, Modal, Select } from 'antd';
import type { FormInstance } from 'antd';

import type { Folder, Id } from '../_types';

type TaskChainModalProps = {
  open: boolean;
  form: FormInstance<{ text: string; folderId: Id }>;
  rootFolders: Folder[];
  rootFoldersLoading: boolean;
  selectedTaskCount: number;
  onCancel: () => void;
  onOk: () => void;
};

export default function TaskChainModal({
  open,
  form,
  rootFolders,
  rootFoldersLoading,
  selectedTaskCount,
  onCancel,
  onOk,
}: TaskChainModalProps) {
  return (
    <Modal
      title="创建任务链"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="创建"
      cancelText="取消"
      width="min(560px, 92vw)"
      okButtonProps={{ disabled: rootFolders.length === 0 }}
      destroyOnClose
    >
      <div
        className="mb-4 rounded-md border px-3 py-2.5 text-[12px]"
        style={{
          background: 'var(--ds-brand-50)',
          borderColor: 'rgba(99, 102, 241, 0.18)',
          color: 'var(--ds-brand-700)',
        }}
      >
        将基于当前选中顺序，把 <strong>{selectedTaskCount}</strong> 条任务串联成一条任务链。
      </div>
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          label="任务链名称"
          name="text"
          rules={[{ required: true, message: '请输入任务链名称' }]}
        >
          <Input placeholder="如：登录 → 进入首页 → 下单回归" autoFocus maxLength={120} />
        </Form.Item>
        <Form.Item
          label="目标根目录"
          name="folderId"
          rules={[{ required: true, message: '请选择目标根目录' }]}
        >
          <Select
            placeholder={rootFolders.length === 0 ? '暂无根目录' : '请选择根目录'}
            loading={rootFoldersLoading}
            disabled={rootFolders.length === 0}
            options={rootFolders.map((folder) => ({
              value: folder.id,
              label: folder.name,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
