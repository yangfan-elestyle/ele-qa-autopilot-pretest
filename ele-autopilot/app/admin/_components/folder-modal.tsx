import { Form, Input, Modal } from 'antd';
import type { FormInstance } from 'antd';

export type FolderModalMode = 'create' | 'rename';

type FolderModalProps = {
  open: boolean;
  mode: FolderModalMode;
  form: FormInstance<{ name: string }>;
  onCancel: () => void;
  onOk: () => void;
};

export default function FolderModal({ open, mode, form, onCancel, onOk }: FolderModalProps) {
  const isCreate = mode === 'create';
  return (
    <Modal
      title={isCreate ? '新建路径' : '重命名路径'}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText={isCreate ? '创建' : '保存'}
      cancelText="取消"
      width="min(480px, 92vw)"
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          label="名称"
          name="name"
          rules={[{ required: true, message: '请输入名称' }]}
        >
          <Input placeholder="如：登录流程、首页 P0、回归用例..." autoFocus maxLength={64} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
