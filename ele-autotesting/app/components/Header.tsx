import { NavLink } from "react-router";
import { useTheme } from "~/providers/ThemeProvider";

const NAV_ITEMS: Array<{ to: string; label: string; end?: boolean }> = [
  { to: "/", label: "主流程", end: true },
  { to: "/models", label: "模型" },
  { to: "/templates", label: "模板" },
  { to: "/history", label: "历史" },
  { to: "/data", label: "数据" },
  { to: "/settings", label: "设置" },
];

export function Header() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const nextTheme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";

  return (
    <header className="theme-header flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold theme-title">QA AutoPilot · AutoTest</h1>
      </div>
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded transition ${
                isActive ? "theme-toolbar-button-active" : "theme-toolbar-button"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          aria-label="切换主题"
          className="ml-2 px-3 py-1.5 rounded text-sm theme-toolbar-button"
          onClick={() => setTheme(nextTheme)}
        >
          {theme === "system" ? `跟随 (${resolvedTheme})` : theme === "light" ? "浅色" : "深色"}
        </button>
      </nav>
    </header>
  );
}
