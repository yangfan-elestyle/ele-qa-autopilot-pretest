import { useCallback, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { ContentType, OptimizationRequest, PromptRecordChain, Template } from "~/lib";
import { useServicesContext } from "~/providers/ServicesProvider";
import { useToast } from "~/providers/ToastProvider";

export type OptimizationMode = "context" | "verify";

export interface ContextConfig {
  contentType: ContentType;
  contentMark: string;
  contents: string;
}

export interface OptimizerState {
  prompt: string;
  optimizedPrompt: string;
  optimizedReasoning: string;
  isOptimizing: boolean;
  isIterating: boolean;
  currentChainId: string;
  currentVersions: PromptRecordChain["versions"];
  currentVersionId: string;
}

const INITIAL_STATE: OptimizerState = {
  prompt: "",
  optimizedPrompt: "",
  optimizedReasoning: "",
  isOptimizing: false,
  isIterating: false,
  currentChainId: "",
  currentVersions: [],
  currentVersionId: "",
};

export function usePromptOptimizer() {
  const { services } = useServicesContext();
  const toast = useToast();
  const [state, setState] = useState<OptimizerState>(INITIAL_STATE);
  const promptRef = useRef(state.prompt);
  promptRef.current = state.prompt;

  const setField = useCallback(
    <K extends keyof OptimizerState>(key: K, value: OptimizerState[K]) =>
      setState((s) => ({ ...s, [key]: value })),
    [],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const optimize = useCallback(
    async (
      mainTemplate: Template | null,
      optimizeModelKey: string,
      mode: OptimizationMode,
      contextConfig: ContextConfig,
    ) => {
      if (!services) return;
      const prompt = promptRef.current;
      if (!prompt.trim()) return;
      if (!mainTemplate) { toast.error("请先选择优化模版"); return; }
      if (!optimizeModelKey) { toast.error("请先选择优化模型"); return; }

      setState((s) => ({ ...s, isOptimizing: true, optimizedPrompt: "", optimizedReasoning: "" }));
      try {
        const request: OptimizationRequest = {
          targetPrompt: prompt,
          templateId: mainTemplate.id,
          modelKey: optimizeModelKey,
        };
        await services.promptService.optimizePromptStream(request, {
          onToken: (t: string) => setState((s) => ({ ...s, optimizedPrompt: s.optimizedPrompt + t })),
          onReasoningToken: (t: string) => setState((s) => ({ ...s, optimizedReasoning: s.optimizedReasoning + t })),
          onComplete: async () => {
            try {
              const recordData: any = {
                id: uuidv4(),
                originalPrompt: prompt,
                optimizedPrompt: "",
                type: mode === "context" ? "ContextOptimizeRecordType" : "VerifyOptimizeRecordType",
                contentType: contextConfig.contentType,
                contentMark: contextConfig.contentMark,
                contents: contextConfig.contents,
                modelKey: optimizeModelKey,
                templateId: mainTemplate.id,
                timestamp: Date.now(),
                metadata: { optimizationMode: mode },
              };
              setState((s) => {
                recordData.optimizedPrompt = s.optimizedPrompt;
                return s;
              });
              const newRecord = await services.historyManager.createNewChain(recordData);
              setState((s) => ({
                ...s,
                currentChainId: newRecord.chainId,
                currentVersions: newRecord.versions,
                currentVersionId: newRecord.currentRecord.id,
              }));
              toast.success("优化成功");
            } catch (err: any) {
              toast.error("保存历史失败: " + (err?.message || err));
            } finally {
              setState((s) => ({ ...s, isOptimizing: false }));
            }
          },
          onError: (err: Error) => {
            toast.error(err.message || "优化失败");
            setState((s) => ({ ...s, isOptimizing: false }));
          },
        });
      } catch (err: any) {
        toast.error(err?.message || "优化失败");
        setState((s) => ({ ...s, isOptimizing: false }));
      }
    },
    [services, toast],
  );

  const iterate = useCallback(
    async (
      params: { originalPrompt: string; optimizedPrompt: string; iterateInput: string },
      iterationTemplate: Template | null,
      optimizeModelKey: string,
      contextConfig: ContextConfig,
    ) => {
      if (!services) return;
      const { originalPrompt, optimizedPrompt: lastOptimized, iterateInput } = params;
      if (!originalPrompt || !lastOptimized || !iterateInput) return;
      if (!iterationTemplate) { toast.error("请先选择迭代提示词"); return; }

      setState((s) => ({ ...s, isIterating: true, optimizedPrompt: "", optimizedReasoning: "" }));
      try {
        await services.promptService.iteratePromptStream(
          originalPrompt,
          lastOptimized,
          iterateInput,
          optimizeModelKey,
          {
            onToken: (t: string) => setState((s) => ({ ...s, optimizedPrompt: s.optimizedPrompt + t })),
            onReasoningToken: (t: string) => setState((s) => ({ ...s, optimizedReasoning: s.optimizedReasoning + t })),
            onComplete: async () => {
              try {
                let currentOptimized = "";
                setState((s) => { currentOptimized = s.optimizedPrompt; return s; });
                const updatedChain = await services.historyManager.addIteration({
                  chainId: state.currentChainId,
                  originalPrompt,
                  optimizedPrompt: currentOptimized,
                  contentType: contextConfig.contentType,
                  contentMark: contextConfig.contentMark,
                  contents: contextConfig.contents,
                  iterationNote: iterateInput,
                  modelKey: optimizeModelKey,
                  templateId: iterationTemplate.id,
                });
                setState((s) => ({
                  ...s,
                  currentVersions: updatedChain.versions,
                  currentVersionId: updatedChain.currentRecord.id,
                }));
                toast.success("迭代完成");
              } catch (err: any) {
                toast.warning("迭代记录失败");
              } finally {
                setState((s) => ({ ...s, isIterating: false }));
              }
            },
            onError: (err: Error) => {
              toast.error(err.message || "迭代失败");
              setState((s) => ({ ...s, isIterating: false }));
            },
          },
          iterationTemplate.id,
        );
      } catch (err: any) {
        toast.error(err?.message || "迭代失败");
        setState((s) => ({ ...s, isIterating: false }));
      }
    },
    [services, toast, state.currentChainId],
  );

  const switchVersion = useCallback(
    (version: PromptRecordChain["versions"][number]) => {
      setState((s) => ({ ...s, optimizedPrompt: version.optimizedPrompt, currentVersionId: version.id }));
    },
    [],
  );

  return { state, setField, optimize, iterate, switchVersion, reset };
}
