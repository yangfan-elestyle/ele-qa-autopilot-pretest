import { useEffect, useState } from "react";
import { useTheme } from "~/providers/ThemeProvider";
import { useServicesContext } from "~/providers/ServicesProvider";
import { useToast } from "~/providers/ToastProvider";

const SHARED_OWNER_ID = "shared-owner-v1";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { services } = useServicesContext();
  const toast = useToast();
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    setVersion(`v${import.meta.env.VITE_APP_VERSION || "1.5.18"}`);
  }, []);

  const clearLocalCache = async () => {
    if (typeof window === "undefined") return;
    if (!window.confirm("确定清空本地 Dexie 缓存？这只删除浏览器本地副本，云端 D1 数据不受影响。")) return;
    try {
      const dbs = await indexedDB.databases?.();
      if (dbs) {
        for (const db of dbs) {
          if (db.name) indexedDB.deleteDatabase(db.name);
        }
      }
      window.localStorage.removeItem(`app:remote-migrated:${SHARED_OWNER_ID}`);
      toast.success("已清空本地缓存，请刷新页面");
    } catch (err: any) {
      toast.error(`清理失败: ${err?.message || err}`);
    }
  };

  return (
    <section className="p-4 max-w-3xl">
      <h2 className="text-xl font-semibold mb-4 theme-title">设置</h2>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-2 theme-text">主题</h3>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                className={`px-3 py-1.5 rounded text-sm ${
                  theme === mode ? "theme-button-primary" : "theme-button"
                }`}
              >
                {mode === "light" ? "浅色" : mode === "dark" ? "深色" : "跟随系统"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2 theme-text">身份</h3>
          <p className="text-sm theme-text-placeholder">
            owner: <code className="theme-input px-1 py-0.5 rounded">device:{SHARED_OWNER_ID}</code>
          </p>
          <p className="text-xs theme-text-placeholder mt-1">
            V1 共享 owner 模式; V2 Google 登录上线后会自动迁移为 google:&lt;sub&gt;.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2 theme-text">本地缓存</h3>
          <button
            type="button"
            onClick={clearLocalCache}
            disabled={!services}
            className="theme-button-secondary px-3 py-1.5 rounded text-sm disabled:opacity-50"
          >
            清空本地 Dexie 缓存
          </button>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2 theme-text">关于</h3>
          <p className="text-sm theme-text-placeholder">QA AutoPilot · AutoTest {version}</p>
        </div>
      </div>
    </section>
  );
}
