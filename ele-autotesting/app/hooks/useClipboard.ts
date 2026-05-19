import { useCallback } from "react";
import { useToast } from "~/providers/ToastProvider";

export function useClipboard() {
  const toast = useToast();
  const copy = useCallback(
    async (text: string, successMsg = "已复制到剪贴板") => {
      if (!text) return false;
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        toast.success(successMsg);
        return true;
      } catch (err) {
        toast.error("复制失败");
        console.error("copy failed:", err);
        return false;
      }
    },
    [toast],
  );
  return { copy };
}
