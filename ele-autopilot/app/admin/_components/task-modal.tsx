import { Form, Input, Modal } from 'antd';
import type { FormInstance } from 'antd';

export type TaskModalMode = 'create' | 'edit';

export type TaskFormValues = { title?: string; text: string };

type TaskModalProps = {
  open: boolean;
  mode: TaskModalMode;
  form: FormInstance<TaskFormValues>;
  onCancel: () => void;
  onOk: () => void;
};

const BATCH_HINT =
  '提示：批量创建用 +++ 分隔多任务，单条任务用 %%% 分隔「标题」与「内容」。例：\nTitleA\n%%%\nContentA\n+++\nTitleB\n%%%\nContentB';

export default function TaskModal({ open, mode, form, onCancel, onOk }: TaskModalProps) {
  const isCreate = mode === 'create';
  return (
    <Modal
      title={isCreate ? '新建任务' : '编辑任务'}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText={isCreate ? '创建' : '保存'}
      cancelText="取消"
      width="min(960px, 92vw)"
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item label="标题（可选）" name="title">
          <Input placeholder="简短标注，便于快速识别任务" allowClear />
        </Form.Item>
        <Form.Item
          label={
            <div className="flex w-full items-center justify-between">
              <span>任务内容</span>
              {isCreate && (
                <span className="text-[11px] font-normal text-(--ds-text-tertiary)">
                  支持 +++ / %%% 批量分隔
                </span>
              )}
            </div>
          }
          name="text"
          rules={[{ required: true, message: '请输入任务内容' }]}
        >
          <Input.TextArea
            placeholder={isCreate ? `请输入任务内容\n\n${BATCH_HINT}` : '请输入任务内容'}
            autoFocus
            autoSize={{ minRows: 14, maxRows: 28 }}
            className="!font-mono !text-[13px] !leading-relaxed"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
