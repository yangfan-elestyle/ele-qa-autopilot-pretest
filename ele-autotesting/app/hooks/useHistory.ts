import { useCallback, useEffect, useState } from "react";
import type { PromptRecordChain } from "~/lib";
import { useServicesContext } from "~/providers/ServicesProvider";

export function useHistory() {
  const { services } = useServicesContext();
  const [chains, setChains] = useState<PromptRecordChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!services) return;
    setLoading(true);
    try {
      const list = await services.historyManager.getAllChains();
      list.sort((a, b) => (b.currentRecord?.timestamp || 0) - (a.currentRecord?.timestamp || 0));
      setChains(list);
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

  return { chains, loading, error, refresh, services };
}
