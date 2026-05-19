import { Link } from "react-router";
import { useHistory } from "~/hooks/useHistory";
import { useToast } from "~/providers/ToastProvider";
import { useState } from "react";

export default function HistoryPage() {
  const { chains, loading, error, refresh, services } = useHistory();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleDelete = async (chainId: string) => {
    if (!services) return;
    if (!window.confirm("确定删除该历史链？")) return;
    try {
      await services.historyManager.deleteChain(chainId);
      toast.success("已删除");
      refresh();
    } catch (err: any) {
      toast.error(`删除失败: ${err?.message || err}`);
    }
  };

  const handleClearAll = async () => {
    if (!services) return;
    if (!window.confirm("确定清空所有历史？")) return;
    try {
      await services.historyManager.clearHistory();
      toast.success("已清空");
      refresh();
    } catch (err: any) {
      toast.error(`清空失败: ${err?.message || err}`);
    }
  };

  if (loading) return <section className="p-4"><p className="theme-text-placeholder">加载中...</p></section>;
  if (error) return <section className="p-4"><p className="text-red-500">{error.message}</p></section>;

  const selected = chains.find((c) => c.chainId === selectedId);

  return (
    <section className="p-4 flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
      <div className="lg:w-1/2 flex flex-col gap-2 min-h-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold theme-title">历史记录 ({chains.length})</h2>
          <button
            type="button"
            disabled={!chains.length}
            onClick={handleClearAll}
            className="theme-button-toggle-active px-3 py-1.5 rounded text-sm disabled:opacity-50"
          >
            清空全部
          </button>
        </div>
        <div className="flex-1 overflow-auto rounded border">
          {chains.length === 0 && <p className="p-4 theme-text-placeholder text-sm">暂无历史记录</p>}
          {chains.map((chain) => (
            <div
              key={chain.chainId}
              className={`p-3 border-b cursor-pointer theme-card ${selectedId === chain.chainId ? "theme-button-toggle-active" : ""}`}
              onClick={() => setSelectedId(chain.chainId)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate theme-text">
                    {chain.rootRecord.originalPrompt.slice(0, 80) || "(空)"}
                  </div>
                  <div className="text-xs theme-text-placeholder mt-1">
                    {chain.versions.length} 版本 · {new Date(chain.currentRecord.timestamp).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs text-red-500 hover:underline"
                  onClick={(e) => { e.stopPropagation(); handleDelete(chain.chainId); }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:w-1/2 flex flex-col gap-2 min-h-0">
        <h3 className="text-sm font-medium theme-title">详情</h3>
        {selected ? (
          <div className="flex-1 overflow-auto rounded border p-3 theme-card">
            <div className="mb-2">
              <span className="text-xs theme-text-placeholder">原始: </span>
              <pre className="text-sm whitespace-pre-wrap theme-text">{selected.rootRecord.originalPrompt}</pre>
            </div>
            <div className="mb-2">
              <span className="text-xs theme-text-placeholder">当前版本输出: </span>
              <pre className="text-sm whitespace-pre-wrap theme-text">{selected.currentRecord.optimizedPrompt}</pre>
            </div>
            <Link
              to={`/?restoreId=${selected.chainId}`}
              className="inline-block mt-3 theme-button-primary px-3 py-1.5 rounded text-sm"
            >
              恢复到主流程
            </Link>
          </div>
        ) : (
          <p className="theme-text-placeholder text-sm">点击左侧记录查看详情</p>
        )}
      </div>
    </section>
  );
}
