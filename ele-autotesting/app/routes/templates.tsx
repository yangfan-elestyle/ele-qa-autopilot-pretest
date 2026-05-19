import { useState } from "react";
import type { Template } from "~/lib";
import { useTemplates } from "~/hooks/useTemplates";
import { useToast } from "~/providers/ToastProvider";

type TemplateType = "optimize" | "userOptimize" | "iterate";

interface FormState {
  id: string;
  name: string;
  content: string;
  templateType: TemplateType;
}

const EMPTY: FormState = { id: "", name: "", content: "", templateType: "optimize" };

export default function TemplatesPage() {
  const { templates, loading, error, refresh, services } = useTemplates();
  const toast = useToast();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [filter, setFilter] = useState<TemplateType | "all">("all");

  const startNew = () => setEditing({ ...EMPTY, id: `tpl-${Date.now()}` });
  const startEdit = (t: Template) => {
    const content = typeof t.content === "string" ? t.content : JSON.stringify(t.content, null, 2);
    setEditing({ id: t.id, name: t.name, content, templateType: t.metadata.templateType });
  };
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!services || !editing) return;
    if (!editing.name.trim() || !editing.content.trim()) {
      toast.error("名称和内容不能为空");
      return;
    }
    try {
      let parsedContent: Template["content"] = editing.content;
      try {
        const j = JSON.parse(editing.content);
        if (Array.isArray(j)) parsedContent = j;
      } catch {
        /* not json, keep as string */
      }
      const template: Template = {
        id: editing.id,
        name: editing.name,
        content: parsedContent,
        metadata: {
          version: "1.0.0",
          lastModified: Date.now(),
          templateType: editing.templateType,
        },
      };
      await services.templateManager.saveTemplate(template);
      toast.success("已保存");
      setEditing(null);
      refresh();
    } catch (err: any) {
      toast.error(`保存失败: ${err?.message || err}`);
    }
  };

  const remove = async (id: string) => {
    if (!services) return;
    if (!window.confirm(`删除模板 ${id}?`)) return;
    try {
      await services.templateManager.deleteTemplate(id);
      toast.success("已删除");
      refresh();
    } catch (err: any) {
      toast.error(`删除失败: ${err?.message || err}`);
    }
  };

  if (loading) return <section className="p-4"><p className="theme-text-placeholder">加载中...</p></section>;
  if (error) return <section className="p-4"><p className="text-red-500">{error.message}</p></section>;

  const filtered = filter === "all" ? templates : templates.filter((t) => t.metadata.templateType === filter);

  return (
    <section className="p-4 flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold theme-title">模板管理 ({templates.length})</h2>
        <div className="flex items-center gap-2 text-sm">
          {(["all", "optimize", "userOptimize", "iterate"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded ${filter === f ? "theme-button-toggle-active" : "theme-button-toggle-inactive"}`}
            >
              {f === "all" ? "全部" : f}
            </button>
          ))}
          <button type="button" onClick={startNew} className="theme-button-primary px-3 py-1.5 rounded">+ 新增</button>
        </div>
      </div>

      <div className="overflow-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="theme-card text-left">
              <th className="p-2">ID</th>
              <th className="p-2">名称</th>
              <th className="p-2">类型</th>
              <th className="p-2">内置</th>
              <th className="p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={5} className="p-4 text-center theme-text-placeholder">暂无模板</td></tr>}
            {filtered.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2 font-mono text-xs">{t.id}</td>
                <td className="p-2">{t.name}</td>
                <td className="p-2">{t.metadata.templateType}</td>
                <td className="p-2">{t.isBuiltin ? "✓" : ""}</td>
                <td className="p-2">
                  <button type="button" onClick={() => startEdit(t)} className="text-blue-500 hover:underline mr-2">
                    {t.isBuiltin ? "查看" : "编辑"}
                  </button>
                  {!t.isBuiltin && (
                    <button type="button" onClick={() => remove(t.id)} className="text-red-500 hover:underline">删除</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <TemplateForm form={editing} onChange={setEditing} onSave={save} onCancel={cancel} />}
    </section>
  );
}

function TemplateForm({
  form,
  onChange,
  onSave,
  onCancel,
}: {
  form: FormState;
  onChange: (next: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const upd = <K extends keyof FormState>(k: K, v: FormState[K]) => onChange({ ...form, [k]: v });
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 theme-mask" onClick={onCancel}>
      <div className="theme-card max-w-3xl w-full p-4 rounded shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-3 theme-title">模板编辑</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs theme-text-placeholder">ID</span>
            <input className="theme-input px-2 py-1 rounded border" value={form.id} onChange={(e) => upd("id", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs theme-text-placeholder">名称</span>
            <input className="theme-input px-2 py-1 rounded border" value={form.name} onChange={(e) => upd("name", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-xs theme-text-placeholder">类型</span>
            <select className="theme-input px-2 py-1 rounded border" value={form.templateType} onChange={(e) => upd("templateType", e.target.value as TemplateType)}>
              <option value="optimize">optimize</option>
              <option value="userOptimize">userOptimize</option>
              <option value="iterate">iterate</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-xs theme-text-placeholder">内容 (纯文本或 MessageTemplate JSON)</span>
            <textarea
              className="theme-input px-2 py-1 rounded border font-mono text-xs"
              rows={14}
              value={form.content}
              onChange={(e) => upd("content", e.target.value)}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onCancel} className="theme-button px-3 py-1.5 rounded text-sm">取消</button>
          <button type="button" onClick={onSave} className="theme-button-primary px-3 py-1.5 rounded text-sm">保存</button>
        </div>
      </div>
    </div>
  );
}
