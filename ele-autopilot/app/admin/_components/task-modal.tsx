import { Form, Input, Modal } from 'antd';
import type { FormInstance } from 'antd';
import { useState } from 'react';

import { useIsMobile } from '../_hooks/use-is-mobile';

export type TaskModalMode = 'create' | 'edit';

export type TaskFormValues = { title?: string; text: string };

type TaskModalProps = {
  open: boolean;
  mode: TaskModalMode;
  form: FormInstance<TaskFormValues>;
  onCancel: () => void;
  onOk: () => void;
};

export default function TaskModal({ open, mode, form, onCancel, onOk }: TaskModalProps) {
  const isCreate = mode === 'create';
  const isMobile = useIsMobile();
  const [helpOpen, setHelpOpen] = useState(false);
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
            <div className="flex w-full items-center justify-between gap-3">
              <span>任务内容</span>
              {isCreate && (
                <button
                  type="button"
                  onClick={() => setHelpOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-(--ds-brand-700) transition-colors hover:text-(--ds-brand-600)"
                  aria-expanded={helpOpen}
                >
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
                    style={{
                      background: 'var(--ds-brand-50)',
                      color: 'var(--ds-brand-700)',
                      boxShadow: 'inset 0 0 0 1px rgba(99, 102, 241, 0.22)',
                    }}
                    aria-hidden="true"
                  >
                    ?
                  </span>
                  {helpOpen ? '收起批量语法' : '批量创建语法'}
                </button>
              )}
            </div>
          }
          name="text"
          rules={[{ required: true, message: '请输入任务内容' }]}
        >
          <Input.TextArea
            placeholder={isCreate ? '请输入任务内容…\n粘贴需求描述或步骤说明。' : '请输入任务内容'}
            autoFocus
            autoSize={
              isMobile ? { minRows: 8, maxRows: 14 } : { minRows: 14, maxRows: 28 }
            }
            className="!font-mono !text-[13px] !leading-relaxed"
          />
        </Form.Item>
        {isCreate && helpOpen && (
          <div className="ds-banner ds-banner-info -mt-2 mb-1 flex flex-col gap-2 !p-3">
            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-(--ds-brand-700)">
              <span className="ds-text-mono">+++</span>
              <span>分隔多条任务</span>
              <span className="opacity-50">·</span>
              <span className="ds-text-mono">%%%</span>
              <span>分隔「标题 / 内容」</span>
            </div>
            <pre
              className="ds-text-mono m-0 overflow-x-auto rounded-md p-2.5 text-[11.5px] leading-[1.7]"
              style={{
                background: 'var(--ds-surface-elevated)',
                color: 'var(--ds-text-secondary)',
                boxShadow: 'inset 0 0 0 1px var(--ds-border-soft)',
              }}
            >{`登录失败提示\n%%%\n输入错误密码，确认有错误提示。\n+++\n注册流程\n%%%\n第一步选择套餐\n第二步填写邮箱`}</pre>
          </div>
        )}
      </Form>
    </Modal>
  );
}
