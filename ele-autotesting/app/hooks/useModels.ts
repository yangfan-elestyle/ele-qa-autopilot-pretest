import { useCallback, useEffect, useState } from "react";
import type { ModelConfig } from "~/lib";
import { useServicesContext } from "~/providers/ServicesProvider";

export type ModelEntry = ModelConfig & { key: string };

export function useModels() {
  const { services } = useServicesContext();
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!services) return;
    setLoading(true);
    try {
      const list = await services.modelManager.getAllModels();
      setModels(list);
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

  return { models, loading, error, refresh, services };
}
