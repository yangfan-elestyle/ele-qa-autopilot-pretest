import { useCallback, useEffect, useState } from "react";
import type { Template } from "~/lib";
import { useServicesContext } from "~/providers/ServicesProvider";

export function useTemplates() {
  const { services } = useServicesContext();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!services) return;
    setLoading(true);
    try {
      const list = await services.templateManager.listTemplates();
      setTemplates(list);
      setError(null);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    if (!services) return;
    refresh();
  }, [services, refresh]);

  const filterByType = useCallback(
    (type: "optimize" | "userOptimize" | "iterate") =>
      templates.filter((t) => t.metadata?.templateType === type),
    [templates],
  );

  return { templates, loading, error, refresh, services, filterByType };
}
