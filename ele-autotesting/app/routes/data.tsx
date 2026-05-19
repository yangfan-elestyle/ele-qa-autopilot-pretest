import { useRef, useState } from "react";
import { useServicesContext } from "~/providers/ServicesProvider";
import { useToast } from "~/providers/ToastProvider";

export default function DataPage() {
  const { services } = useServicesContext();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (!services) return;
    setBusy(true);
    try {
      const json = await services.dataManager.exportAllData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qa-autotest-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("已导出");
    } catch (err: any) {
      toast.error(`导出失败: ${err?.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (file: File) => {
    if (!services) return;
    setBusy(true);
    try {
      const text = await file.text();
      await services.dataManager.importAllData(text);
      toast.success("已导入，1.5 秒后刷新");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(`导入失败: ${err?.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  const handleClearAll = async () => {
    if (!services) return;
    if (!window.confirm("确定清空当前账号所有云端数据？此操作不可逆。")) return;
    setBusy(true);
    try {
      const remote = (services as any);
      const headers = { "X-Device-Id": "shared-owner-v1" };
      const res = await fetch("/autotest/api/sync/items", { method: "DELETE", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("已清空，刷新后生效");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      toast.error(`清空失败: ${err?.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="p-4 max-w-3xl">
      <h2 className="text-xl font-semibold mb-4 theme-title">数据管理</h2>
      <div className="space-y-4">
        <div>
          <button
            type="button"
            disabled={busy || !services}
            onClick={handleExport}
            className="theme-button-primary px-3 py-1.5 rounded text-sm disabled:opacity-50"
          >
            导出全部 (JSON)
          </button>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <button
            type="button"
            disabled={busy || !services}
            onClick={() => fileRef.current?.click()}
            className="theme-button-secondary px-3 py-1.5 rounded text-sm disabled:opacity-50"
          >
            导入 JSON
          </button>
        </div>
        <div className="pt-4 border-t">
          <button
            type="button"
            disabled={busy || !services}
            onClick={handleClearAll}
            className="theme-button-toggle-active px-3 py-1.5 rounded text-sm disabled:opacity-50"
          >
            清空当前账号云端数据
          </button>
        </div>
      </div>
    </section>
  );
}
