import { useState } from "react";
import type { ModelConfig } from "~/lib";
import { useModels, type ModelEntry } from "~/hooks/useModels";
import { useToast } from "~/providers/ToastProvider";

const PROVIDERS = ["openai", "gemini", "custom"] as const;

type FormState = ModelConfig & { key: string };

const EMPTY: FormState = {
  key: "",
  name: "",
  baseURL: "",
  apiKey: "",
  defaultModel: "",
  enabled: true,
  provider: "openai",
};

export default function ModelsPage() {
  const { models, loading, error, refresh, services } = useModels();
  const toast = useToast();
  const [editing, setEditing] = useState<FormState | null>(null);

  const startNew = () => setEditing({ ...EMPTY });
  const startEdit = (m: ModelEntry) => setEditing({ ...EMPTY, ...m, apiKey: m.apiKey ?? "" });
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!services || !editing) return;
    if (!editing.key.trim()) { toast.error("key 不能为空"); return; }
    if (!editing.name.trim()) { toast.error("name 不能为空"); return; }
    try {
      const existing = await services.modelManager.getModel(editing.key);
      const config: ModelConfig = {
        name: editing.name,
        baseURL: editing.baseURL,
        apiKey: editing.apiKey || undefined,
        defaultModel: editing.defaultModel,
        enabled: editing.enabled,
        provider: editing.provider,
      };
      if (existing) await services.modelManager.updateModel(editing.key, config);
      else await services.modelManager.addModel(editing.key, config);
      toast.success("已保存");
      setEditing(null);
      refresh();
    } catch (err: any) {
      toast.error(`保存失败: ${err?.message || err}`);
    }
  };

  const remove = async (key: string) => {
    if (!services) return;
    if (!window.confirm(`删除模型 ${key}?`)) return;
    try {
      await services.modelManager.deleteModel(key);
      toast.success("已删除");
      refresh();
    } catch (err: any) { toast.error(`删除失败: ${err?.message || err}`); }
  };

  const toggle = async (m: ModelEntry) => {
    if (!services) return;
    try {
      if (m.enabled) await services.modelManager.disableModel(m.key);
      else await services.modelManager.enableModel(m.key);
      refresh();
    } catch (err: any) { toast.error(`切换失败: ${err?.message || err}`); }
  };

  if (loading) return <section className="p-4"><p className="theme-text-placeholder">加载中...</p></section>;
  if (error) return <section className="p-4"><p className="text-red-500">{error.message}</p></section>;

  return (
    <section className="p-4 flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold theme-title">模型管理 ({models.length})</h2>
        <button type="button" onClick={startNew} className="theme-button-primary px-3 py-1.5 rounded text-sm">+ 新增</button>
      </div>

      <div className="overflow-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="theme-card text-left">
              <th className="p-2">Key</th>
              <th className="p-2">名称</th>
              <th className="p-2">Provider</th>
              <th className="p-2">默认模型</th>
              <th className="p-2">状态</th>
              <th className="p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center theme-text-placeholder">暂无模型</td></tr>
            )}
            {models.map((m) => (
              <tr key={m.key} className="border-t">
                <td className="p-2 font-mono text-xs">{m.key}</td>
                <td className="p-2">{m.name}</td>
                <td className="p-2">{m.provider}</td>
                <td className="p-2">{m.defaultModel}</td>
                <td className="p-2">
                  <button type="button" onClick={() => toggle(m)} className={`px-2 py-0.5 rounded text-xs ${m.enabled ? "theme-button-on" : "theme-button-off"}`}>
                    {m.enabled ? "启用" : "禁用"}
                  </button>
                </td>
                <td className="p-2">
                  <button type="button" onClick={() => startEdit(m)} className="text-blue-500 hover:underline mr-2">编辑</button>
                  <button type="button" onClick={() => remove(m.key)} className="text-red-500 hover:underline">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ModelForm form={editing} onChange={setEditing} onSave={save} onCancel={cancel} />
      )}
    </section>
  );
}

interface FormProps {
  form: FormState;
  onChange: (next: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
}

function ModelForm({ form, onChange, onSave, onCancel }: FormProps) {
  const upd = <K extends keyof FormState>(k: K, v: FormState[K]) => onChange({ ...form, [k]: v });
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 theme-mask" onClick={onCancel}>
      <div
        className="theme-card max-w-xl w-full p-4 rounded shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-3 theme-title">{form.key ? "编辑模型" : "新增模型"}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Key">
            <input className="theme-input w-full px-2 py-1 rounded border" value={form.key} onChange={(e) => upd("key", e.target.value)} placeholder="openai" />
          </Field>
          <Field label="名称">
            <input className="theme-input w-full px-2 py-1 rounded border" value={form.name} onChange={(e) => upd("name", e.target.value)} placeholder="OpenAI" />
          </Field>
          <Field label="Provider">
            <select className="theme-input w-full px-2 py-1 rounded border" value={form.provider} onChange={(e) => upd("provider", e.target.value as any)}>
              {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="默认模型">
            <input className="theme-input w-full px-2 py-1 rounded border" value={form.defaultModel} onChange={(e) => upd("defaultModel", e.target.value)} placeholder="gpt-4o" />
          </Field>
          <Field label="Base URL" className="col-span-2">
            <input className="theme-input w-full px-2 py-1 rounded border" value={form.baseURL} onChange={(e) => upd("baseURL", e.target.value)} placeholder="https://api.openai.com/v1" />
          </Field>
          <Field label="API Key" className="col-span-2">
            <input type="password" className="theme-input w-full px-2 py-1 rounded border" value={form.apiKey || ""} onChange={(e) => upd("apiKey", e.target.value)} />
          </Field>
          <Field label="启用">
            <input type="checkbox" checked={form.enabled} onChange={(e) => upd("enabled", e.target.checked)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onCancel} className="theme-button px-3 py-1.5 rounded text-sm">取消</button>
          <button type="button" onClick={onSave} className="theme-button-primary px-3 py-1.5 rounded text-sm">保存</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs theme-text-placeholder">{label}</span>
      {children}
    </label>
  );
}
