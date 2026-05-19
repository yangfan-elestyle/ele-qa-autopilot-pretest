import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "info" | "warning" | "error";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
  error: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_CLASS: Record<ToastKind, string> = {
  success: "bg-green-600 text-white",
  info: "bg-blue-600 text-white",
  warning: "bg-amber-500 text-white",
  error: "bg-red-600 text-white",
};

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++counter;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((it) => it.id !== id)), 3500);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (m) => push("success", m),
      info: (m) => push("info", m),
      warning: (m) => push("warning", m),
      error: (m) => push("error", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {items.map((it) => (
          <div
            key={it.id}
            className={`pointer-events-auto max-w-md px-4 py-2 rounded shadow text-sm ${KIND_CLASS[it.kind]}`}
            role="status"
          >
            {it.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
