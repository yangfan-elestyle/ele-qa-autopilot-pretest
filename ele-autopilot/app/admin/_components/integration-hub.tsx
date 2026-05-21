import {
  ApiOutlined,
  CheckCircleFilled,
  ControlOutlined,
  ExclamationCircleFilled,
  LoadingOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { fetchAgentConfig, useAgentConnection } from '../_hooks/use-agent-connection';
import type { JobConfig } from '../_types';

// ────────────────────────────────────────────────────────────────────────────
// 执行参数 schema — 与 ele-autopilot-local/autopilot/config.py `JobConfig`
// pydantic 模型一一对应; 改字段名前必须同步两端 (本文件 + pydantic + D1 init).
// `defaultValue` 是用户视角的默认值 (= migrations/0001_init.sql `agent_config` 初值),
// 不是 pydantic 的 None — 后者代表"使用 browser-use 内部默认", 终端用户不需要暴露.
// ────────────────────────────────────────────────────────────────────────────

type FieldType = 'bool' | 'number' | 'string' | 'textarea';

type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  min?: number;
  placeholder?: string;
  defaultValue: unknown;
};

const CONFIG_GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: '基础',
    fields: [
      {
        key: 'gemini_model',
        label: 'Gemini 模型',
        type: 'string',
        hint: '示例: gemini-3-flash-preview / gemini-2.5-pro / gemini-2.0-flash',
        placeholder: 'gemini-3-flash-preview',
        defaultValue: 'gemini-3-flash-preview',
      },
      {
        key: 'max_steps',
        label: '最大执行步骤',
        type: 'number',
        hint: 'Agent 在一个 task 内最多执行的步骤数, 防止跑飞.',
        min: 1,
        defaultValue: 1000,
      },
      {
        key: 'headless',
        label: '无头模式',
        type: 'bool',
        hint: '关闭时可见 Chrome 窗口, 便于观察; 开启则后台运行.',
        defaultValue: false,
      },
    ],
  },
  {
    title: '行为',
    fields: [
      {
        key: 'use_vision',
        label: '使用视觉',
        type: 'bool',
        hint: '让模型读截图. 关闭可省 token, 但页面交互精度下降.',
        defaultValue: true,
      },
      {
        key: 'max_failures',
        label: '最大连续失败次数',
        type: 'number',
        hint: '连续失败超过此值整个 task 失败.',
        min: 1,
        defaultValue: 10,
      },
      {
        key: 'max_actions_per_step',
        label: '每步最大动作数',
        type: 'number',
        hint: 'Agent 单步内并行执行的 action 数, 调大更激进, 调小更稳.',
        min: 1,
        defaultValue: 1,
      },
      {
        key: 'use_thinking',
        label: '启用思考',
        type: 'bool',
        hint: '让模型先输出推理再行动, 速度变慢但稳定性上升.',
        defaultValue: false,
      },
      {
        key: 'flash_mode',
        label: '快速模式',
        type: 'bool',
        hint: '跳过部分中间环节直接出动作, 适合 flash 系列轻量模型.',
        defaultValue: true,
      },
    ],
  },
  {
    title: '超时 (秒)',
    fields: [
      {
        key: 'llm_timeout',
        label: 'LLM 调用超时',
        type: 'number',
        hint: '单次模型调用超时. 模型慢 / 网络抖动时调大.',
        min: 1,
        defaultValue: 240,
      },
      {
        key: 'step_timeout',
        label: '单步执行超时',
        type: 'number',
        hint: 'Agent 单步 (含浏览器动作 + 模型调用) 整体超时.',
        min: 1,
        defaultValue: 240,
      },
    ],
  },
  {
    title: '提示词',
    fields: [
      {
        key: 'override_system_message',
        label: '覆盖系统提示词',
        type: 'textarea',
        hint: '完全替换 browser-use 默认 system prompt. 留空使用默认. 慎用.',
        placeholder: '留空使用默认',
        defaultValue: '',
      },
      {
        key: 'extend_system_message',
        label: '追加系统提示词',
        type: 'textarea',
        hint: '在默认 system prompt 末尾追加内容. 用于补充全局约束.',
        placeholder: '留空不追加',
        defaultValue: '',
      },
    ],
  },
];

const ALL_FIELDS: FieldDef[] = CONFIG_GROUPS.flatMap((g) => g.fields);
const DEFAULT_CONFIG: JobConfig = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f.defaultValue]));

// 预设: 覆盖部分字段; 未列出的字段保持当前值不变, 这样调度方案与个人偏好正交.
type Preset = { key: string; label: string; desc: string; patch: Partial<JobConfig> };

const PRESETS: Preset[] = [
  {
    key: 'fast-debug',
    label: '快速调试',
    desc: '可视窗口 + flash 模式 + 关思考, 适合现场盯执行细节',
    patch: { headless: false, flash_mode: true, use_thinking: false, max_actions_per_step: 1 },
  },
  {
    key: 'stable-prod',
    label: '稳健生产',
    desc: '无头 + 启用思考 + 单步多动作, 适合无人值守批量执行',
    patch: {
      headless: true,
      flash_mode: false,
      use_thinking: true,
      max_actions_per_step: 3,
      max_failures: 5,
    },
  },
  {
    key: 'low-cost',
    label: '省成本',
    desc: '关视觉 + 关思考 + flash, 适合纯文本任务和大批量回归',
    patch: { use_vision: false, use_thinking: false, flash_mode: true },
  },
];

// ────────────────────────────────────────────────────────────────────────────
// 本地 Agent 面板.
// ────────────────────────────────────────────────────────────────────────────

function LocalAgentPanel() {
  const { agentUrl, setAgentUrl, status, agentInfo, checkConnection, isChecking } =
    useAgentConnection();
  const [inputUrl, setInputUrl] = useState(agentUrl);

  useEffect(() => setInputUrl(agentUrl), [agentUrl]);

  const handleCheck = async () => {
    if (inputUrl !== agentUrl) setAgentUrl(inputUrl);
    else await checkConnection();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-(--ant-color-text-secondary)">
        本机 <code>ele-autopilot-local</code> 进程的访问地址, 默认{' '}
        <code>http://127.0.0.1:8000</code>. Job 下发时浏览器直连这个地址, 心跳每 2s 检测一次.
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium text-(--ant-color-text-secondary)">
          Agent 地址
        </label>
        <Input
          placeholder="http://127.0.0.1:8000"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onPressEnter={() => void handleCheck()}
          suffix={
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              loading={isChecking}
              onClick={() => void handleCheck()}
            />
          }
        />
      </div>

      <div className="rounded-md border border-(--ant-color-border-secondary) bg-(--ant-color-fill-quaternary) p-3 text-xs leading-relaxed">
        <div className="mb-1 font-medium text-(--ant-color-text)">连接状态</div>
        {status === 'connected' && agentInfo ? (
          <div className="text-(--ant-color-text-secondary)">
            <CheckCircleFilled style={{ color: 'var(--ant-color-success)' }} />{' '}
            {agentInfo.service.name} · 已运行 {Math.floor(agentInfo.uptime_seconds / 60)} 分钟
          </div>
        ) : status === 'checking' ? (
          <div className="text-(--ant-color-text-secondary)">
            <LoadingOutlined /> 检测中…
          </div>
        ) : (
          <div className="text-(--ant-color-error)">
            <ExclamationCircleFilled /> 未连接, 请确认本机 <code>ele-autopilot</code> CLI 已启动.
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 执行参数面板.
// ────────────────────────────────────────────────────────────────────────────

type FormState = Record<string, unknown>;
type FormChanges = { dirty: boolean; diff: string[] };

function valuesEqual(a: unknown, b: unknown): boolean {
  // 字符串字段两端的 trim 视作等价 (避免末尾空格扰人); 其他类型直接 ===.
  if (typeof a === 'string' && typeof b === 'string') return a.trim() === b.trim();
  return a === b;
}

function computeChanges(form: FormState, base: FormState): FormChanges {
  const diff = ALL_FIELDS.map((f) => f.key).filter((k) => !valuesEqual(form[k], base[k]));
  return { dirty: diff.length > 0, diff };
}

function fieldEqualsDefault(form: FormState, field: FieldDef): boolean {
  return valuesEqual(form[field.key], field.defaultValue);
}

function AgentConfigPanel({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState<FormState>({});
  const [form, setForm] = useState<FormState>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const cfg = await fetchAgentConfig();
      // 后端缺字段时用默认值填充, 保证 UI 不出现 undefined.
      const merged: FormState = { ...DEFAULT_CONFIG, ...cfg };
      setOriginal(merged);
      setForm({ ...merged });
    } catch (e) {
      setLoadError(`加载失败: ${(e as Error)?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const changes = useMemo(() => computeChanges(form, original), [form, original]);
  useEffect(() => {
    onDirtyChange(changes.dirty);
  }, [changes.dirty, onDirtyChange]);

  const setField = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyPatch = (patch: Partial<JobConfig>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 覆盖式写入, 保留 UI 未知字段 (前向兼容: 后端先加字段时不被前端旧 schema 抹掉).
      const payload: JobConfig = { ...original };
      for (const f of ALL_FIELDS) payload[f.key] = form[f.key];

      const resp = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const updated = (await resp.json()) as JobConfig;
      const merged: FormState = { ...DEFAULT_CONFIG, ...updated };
      setOriginal(merged);
      setForm({ ...merged });
      message.success('已保存');
    } catch (e) {
      message.error(`保存失败: ${(e as Error)?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    modal.confirm({
      title: '把所有字段恢复到默认值?',
      content: '此操作不会立即写云端, 仅修改表单. 你需要点击「保存」才会生效.',
      okText: '恢复默认',
      cancelText: '取消',
      onOk: () => setForm({ ...DEFAULT_CONFIG }),
    });
  };

  const handleExport = () => {
    const json = JSON.stringify(form, null, 2);
    void navigator.clipboard.writeText(json).then(
      () => message.success('完整 JSON 已复制到剪贴板'),
      () => message.error('复制失败, 请手动选中'),
    );
  };

  const handleImport = () => {
    let text = '';
    modal.confirm({
      title: '从 JSON 导入',
      width: 560,
      okText: '应用到表单',
      cancelText: '取消',
      content: (
        <Input.TextArea
          autoSize={{ minRows: 8, maxRows: 16 }}
          placeholder='{"gemini_model": "...", "max_steps": 1000, ...}'
          onChange={(e) => {
            text = e.target.value;
          }}
        />
      ),
      onOk: () => {
        try {
          const parsed = JSON.parse(text);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            throw new Error('必须是 JSON 对象');
          }
          // 仅采纳 schema 内字段, 其他 key 丢弃避免污染.
          const next: FormState = { ...form };
          for (const f of ALL_FIELDS) {
            if (f.key in parsed) next[f.key] = (parsed as FormState)[f.key];
          }
          setForm(next);
          message.success('已应用到表单, 检查后点击「保存」');
        } catch (e) {
          message.error(`导入失败: ${(e as Error)?.message ?? e}`);
        }
      },
    });
  };

  if (loadError) {
    return (
      <div className="space-y-3 py-4">
        <div className="text-(--ant-color-error)">{loadError}</div>
        <Button onClick={() => void load()}>重试</Button>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="py-6 text-center text-(--ant-color-text-secondary)">
        <LoadingOutlined /> 加载中…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-(--ant-color-text-secondary)">
        本机 Agent 执行任务时使用的 browser-use 参数. 保存到云端 D1, 下一个 Job 创建时读取最新值.
      </p>

      {/* 预设方案 */}
      <div className="rounded-md border border-(--ant-color-border-secondary) p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-(--ant-color-text)">
          <ThunderboltOutlined style={{ color: 'var(--ant-color-warning)' }} /> 预设方案
        </div>
        <Space wrap>
          {PRESETS.map((p) => (
            <Tooltip key={p.key} title={p.desc}>
              <Button size="small" onClick={() => applyPatch(p.patch)}>
                {p.label}
              </Button>
            </Tooltip>
          ))}
          <Tooltip title="把所有字段恢复到默认值 (不会立刻写云端)">
            <Button size="small" icon={<UndoOutlined />} onClick={handleResetAll}>
              全部恢复默认
            </Button>
          </Tooltip>
        </Space>
        <p className="mt-2 text-xs text-(--ant-color-text-tertiary)">
          预设只覆盖相关字段, 其他字段保持你当前的值. 应用后仍需点击下方「保存」.
        </p>
      </div>

      {/* 字段分组 */}
      {CONFIG_GROUPS.map((group) => (
        <section key={group.title} className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-(--ant-color-text-secondary) uppercase">
            {group.title}
          </h3>
          <div className="space-y-2">
            {group.fields.map((field) => (
              <FieldRow
                key={field.key}
                field={field}
                value={form[field.key]}
                onChange={(v) => setField(field.key, v)}
                onResetToDefault={() => setField(field.key, field.defaultValue)}
                isDefault={fieldEqualsDefault(form, field)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* 高级: Export / Import */}
      <details
        open={advancedOpen}
        onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
        className="rounded-md border border-dashed border-(--ant-color-border-secondary) p-3"
      >
        <summary className="cursor-pointer text-xs text-(--ant-color-text-secondary)">
          高级 · JSON 导入 / 导出
        </summary>
        <div className="mt-2 flex items-center gap-2">
          <Button size="small" onClick={handleExport}>
            复制当前表单 JSON
          </Button>
          <Button size="small" onClick={handleImport}>
            从 JSON 导入
          </Button>
        </div>
      </details>

      {/* sticky 底部操作栏 */}
      <div className="sticky -bottom-6 -mx-6 mt-2 flex items-center gap-2 border-t border-(--ant-color-border-secondary) bg-(--ant-color-bg-elevated) px-6 py-3">
        <span className="text-xs text-(--ant-color-text-tertiary)">
          {changes.dirty ? (
            <>
              <Tag color="warning" className="!mr-1">
                未保存
              </Tag>
              {changes.diff.length} 项改动
            </>
          ) : (
            <>
              <Tag color="success" className="!mr-1">
                已同步
              </Tag>
              与云端一致
            </>
          )}
        </span>
        <span className="flex-1" />
        <Button onClick={() => setForm({ ...original })} disabled={!changes.dirty || saving}>
          撤销
        </Button>
        <Button
          type="primary"
          onClick={() => void handleSave()}
          loading={saving}
          disabled={!changes.dirty}
        >
          保存
        </Button>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  onResetToDefault,
  isDefault,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  onResetToDefault: () => void;
  isDefault: boolean;
}) {
  return (
    <div className="rounded-md border border-(--ant-color-border-secondary) p-3 transition-colors hover:border-(--ant-color-border)">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-(--ant-color-text)">{field.label}</span>
            <code className="text-xs text-(--ant-color-text-tertiary)">{field.key}</code>
            {!isDefault && (
              <Tag color="processing" className="!mr-0">
                已自定义
              </Tag>
            )}
          </div>
          {field.hint && (
            <div className="mt-1 text-xs leading-relaxed text-(--ant-color-text-secondary)">
              {field.hint}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {field.type === 'bool' && (
            <Switch checked={Boolean(value)} onChange={(checked) => onChange(checked)} />
          )}
          {!isDefault && (
            <Tooltip title={`恢复默认: ${formatDefault(field)}`}>
              <Button
                type="text"
                size="small"
                icon={<UndoOutlined />}
                onClick={onResetToDefault}
              />
            </Tooltip>
          )}
        </div>
      </div>

      {field.type === 'string' && (
        <Input
          className="mt-2"
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.type === 'number' && (
        <InputNumber
          className="mt-2 !w-44"
          value={(value as number) ?? null}
          min={field.min}
          onChange={(v) => onChange(v ?? null)}
        />
      )}
      {field.type === 'textarea' && (
        <Input.TextArea
          className="mt-2 font-mono !text-xs"
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          autoSize={{ minRows: 3, maxRows: 10 }}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function formatDefault(field: FieldDef): string {
  if (field.type === 'bool') return field.defaultValue ? '启用' : '禁用';
  if (field.type === 'textarea' || field.type === 'string') {
    const s = String(field.defaultValue ?? '');
    return s === '' ? '空' : s;
  }
  return String(field.defaultValue);
}

// ────────────────────────────────────────────────────────────────────────────
// 集成中心 Modal.
// ────────────────────────────────────────────────────────────────────────────

type IntegrationHubProps = {
  open: boolean;
  onClose: () => void;
};

export default function IntegrationHub({ open, onClose }: IntegrationHubProps) {
  const { modal } = App.useApp();
  const [activeTab, setActiveTab] = useState('agent');
  const [configDirty, setConfigDirty] = useState(false);

  // 关闭时若执行参数有未保存改动, 二次确认.
  const handleClose = () => {
    if (configDirty) {
      modal.confirm({
        title: '有未保存的改动',
        content: '执行参数 tab 里有改动尚未保存. 关闭后改动会丢失.',
        okText: '丢弃并关闭',
        cancelText: '继续编辑',
        okButtonProps: { danger: true },
        onOk: onClose,
      });
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={780}
      destroyOnHidden
      style={{ top: 32 }}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' } }}
      title={
        <div className="flex items-center gap-2">
          <ControlOutlined />
          <span>集成中心</span>
          <span className="text-xs font-normal text-(--ant-color-text-tertiary)">
            统一管理 Autopilot 用户配置
          </span>
        </div>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'agent',
            label: (
              <span>
                <ApiOutlined /> 本地 Agent
              </span>
            ),
            children: <LocalAgentPanel />,
          },
          {
            key: 'config',
            label: (
              <span>
                <ControlOutlined /> 执行参数{' '}
                {configDirty && <Tag color="warning" className="!ml-1 !mr-0">未保存</Tag>}
              </span>
            ),
            children: <AgentConfigPanel onDirtyChange={setConfigDirty} />,
          },
        ]}
      />
    </Modal>
  );
}

// Header 用的"集成中心"入口按钮.
export function IntegrationHubTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip title="集成中心">
      <Button type="default" icon={<ControlOutlined />} onClick={onClick}>
        集成中心
      </Button>
    </Tooltip>
  );
}
