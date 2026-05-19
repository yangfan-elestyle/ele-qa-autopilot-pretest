import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useModels } from "~/hooks/useModels";
import { useTemplates } from "~/hooks/useTemplates";
import {
  usePromptOptimizer,
  type ContextConfig,
  type OptimizationMode,
} from "~/hooks/usePromptOptimizer";
import { useClipboard } from "~/hooks/useClipboard";
import { useServicesContext } from "~/providers/ServicesProvider";
import { useToast } from "~/providers/ToastProvider";
import type { ContentType, Template } from "~/lib";

const CONTENT_TYPES = [
  "prompt_plaintext",
  "prompt_url",
  "prompt_figma",
  "prompt_image",
  "prompt_file",
] as const;

const DEFAULT_CONTEXT: ContextConfig = {
  contentType: "prompt_plaintext",
  contentMark: "",
  contents: "",
};

export default function IndexPage() {
  const { services, isInitializing, error } = useServicesContext();
  const { models, refresh: refreshModels } = useModels();
  const { templates, refresh: refreshTemplates } = useTemplates();
  const toast = useToast();
  const { copy } = useClipboard();
  const { state, setField, optimize, iterate, switchVersion } = usePromptOptimizer();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<OptimizationMode>("context");
  const [optimizeModel, setOptimizeModel] = useState("");
  const [contextConfig, setContextConfig] = useState<ContextConfig>(DEFAULT_CONTEXT);
  const [mainTemplate, setMainTemplate] = useState<Template | null>(null);
  const [iterateTemplate, setIterateTemplate] = useState<Template | null>(null);
  const [iterateInput, setIterateInput] = useState("");

  const enabledModels = useMemo(() => models.filter((m) => m.enabled), [models]);
  const optimizeTemplates = useMemo(
    () => templates.filter((t) => t.metadata.templateType === (mode === "context" ? "optimize" : "userOptimize")),
    [templates, mode],
  );
  const iterateTemplates = useMemo(
    () => templates.filter((t) => t.metadata.templateType === "iterate"),
    [templates],
  );

  useEffect(() => {
    if (!optimizeModel && enabledModels.length > 0) setOptimizeModel(enabledModels[0].key);
  }, [enabledModels, optimizeModel]);

  useEffect(() => {
    if ((!mainTemplate || !optimizeTemplates.find((t) => t.id === mainTemplate.id)) && optimizeTemplates[0]) {
      setMainTemplate(optimizeTemplates[0]);
    }
  }, [optimizeTemplates, mainTemplate]);

  useEffect(() => {
    if (!iterateTemplate && iterateTemplates[0]) setIterateTemplate(iterateTemplates[0]);
  }, [iterateTemplates, iterateTemplate]);

  // Restore from history if ?restoreId=
  useEffect(() => {
    const restoreId = searchParams.get("restoreId");
    if (!restoreId || !services) return;
    (async () => {
      try {
        const chain = await services.historyManager.getChain(restoreId);
        setField("prompt", chain.rootRecord.originalPrompt);
        setField("optimizedPrompt", chain.currentRecord.optimizedPrompt);
        setField("currentChainId", chain.chainId);
        setField("currentVersions", chain.versions);
        setField("currentVersionId", chain.currentRecord.id);
        if ((chain.rootRecord as any).contentType) {
          setContextConfig({
            contentType: (chain.rootRecord as any).contentType,
            contentMark: (chain.rootRecord as any).contentMark || "",
            contents: (chain.rootRecord as any).contents || "",
          });
        }
        toast.success("已从历史恢复");
      } catch (err: any) {
        toast.error(`恢复失败: ${err?.message || err}`);
      }
    })();
  }, [searchParams, services]);

  if (isInitializing) return <section className="p-4"><p className="theme-text-placeholder">正在初始化服务...</p></section>;
  if (error) return <section className="p-4"><p className="text-red-500">初始化失败: {error.message}</p></section>;
  if (!services) return <section className="p-4"><p className="text-red-500">服务未就绪</p></section>;

  const handleOptimize = () => optimize(mainTemplate, optimizeModel, mode, contextConfig);

  const handleIterate = () => {
    iterate(
      { originalPrompt: state.prompt, optimizedPrompt: state.optimizedPrompt, iterateInput },
      iterateTemplate,
      optimizeModel,
      contextConfig,
    );
    setIterateInput("");
  };

  return (
    <section className="p-4 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="theme-card rounded p-4 flex flex-col gap-3 min-h-0">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="theme-text-placeholder">模式:</span>
          {(["context", "verify"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-2 py-1 rounded ${mode === m ? "theme-button-toggle-active" : "theme-button-toggle-inactive"}`}
            >
              {m === "context" ? "上下文优化" : "内容验证"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs theme-text-placeholder">优化模型</span>
            <select
              className="theme-input px-2 py-1 rounded border"
              value={optimizeModel}
              onChange={(e) => setOptimizeModel(e.target.value)}
            >
              <option value="">- 请选择 -</option>
              {enabledModels.map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs theme-text-placeholder">优化模板</span>
            <select
              className="theme-input px-2 py-1 rounded border"
              value={mainTemplate?.id || ""}
              onChange={(e) => setMainTemplate(optimizeTemplates.find((t) => t.id === e.target.value) || null)}
            >
              <option value="">- 请选择 -</option>
              {optimizeTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer theme-text-placeholder">上下文配置</summary>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <label className="flex flex-col gap-1">
              <span className="theme-text-placeholder">contentType</span>
              <select
                className="theme-input px-2 py-1 rounded border"
                value={contextConfig.contentType}
                onChange={(e) => setContextConfig({ ...contextConfig, contentType: e.target.value as ContentType })}
              >
                {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="theme-text-placeholder">contentMark</span>
              <input
                className="theme-input px-2 py-1 rounded border"
                value={contextConfig.contentMark}
                onChange={(e) => setContextConfig({ ...contextConfig, contentMark: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 col-span-2">
              <span className="theme-text-placeholder">contents</span>
              <textarea
                className="theme-input px-2 py-1 rounded border"
                rows={3}
                value={contextConfig.contents}
                onChange={(e) => setContextConfig({ ...contextConfig, contents: e.target.value })}
              />
            </label>
          </div>
        </details>

        <label className="flex flex-col gap-1 flex-1 min-h-0">
          <span className="text-xs theme-text-placeholder">原始 prompt</span>
          <textarea
            className="theme-input px-2 py-1 rounded border flex-1 min-h-[200px] resize-none"
            value={state.prompt}
            onChange={(e) => setField("prompt", e.target.value)}
            placeholder="请输入需要优化的提示词..."
          />
        </label>

        <button
          type="button"
          onClick={handleOptimize}
          disabled={state.isOptimizing || !state.prompt.trim()}
          className="theme-button-primary px-3 py-2 rounded text-sm disabled:opacity-50"
        >
          {state.isOptimizing ? "优化中..." : "开始优化 →"}
        </button>
      </div>

      <div className="theme-card rounded p-4 flex flex-col gap-3 min-h-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium theme-title">优化结果</h3>
          <div className="flex items-center gap-2 text-xs">
            {state.currentVersions.length > 0 && (
              <select
                className="theme-input px-1 py-0.5 rounded border text-xs"
                value={state.currentVersionId}
                onChange={(e) => {
                  const v = state.currentVersions.find((vv) => vv.id === e.target.value);
                  if (v) switchVersion(v);
                }}
              >
                {state.currentVersions.map((v, i) => (
                  <option key={v.id} value={v.id}>v{i + 1}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              disabled={!state.optimizedPrompt}
              onClick={() => copy(state.optimizedPrompt)}
              className="theme-button px-2 py-1 rounded disabled:opacity-50"
            >
              复制
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto rounded border p-2 text-sm whitespace-pre-wrap theme-text">
          {state.optimizedReasoning && (
            <details className="mb-2 theme-text-placeholder">
              <summary className="cursor-pointer text-xs">推理过程</summary>
              <pre className="text-xs whitespace-pre-wrap">{state.optimizedReasoning}</pre>
            </details>
          )}
          {state.optimizedPrompt || <span className="theme-text-placeholder">优化结果将在此处显示</span>}
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer theme-text-placeholder">迭代</summary>
          <div className="flex flex-col gap-2 mt-2">
            <label className="flex flex-col gap-1">
              <span className="theme-text-placeholder">迭代模板</span>
              <select
                className="theme-input px-2 py-1 rounded border"
                value={iterateTemplate?.id || ""}
                onChange={(e) => setIterateTemplate(iterateTemplates.find((t) => t.id === e.target.value) || null)}
              >
                <option value="">- 请选择 -</option>
                {iterateTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <textarea
              className="theme-input px-2 py-1 rounded border"
              rows={3}
              placeholder="说明本次迭代希望调整的方向..."
              value={iterateInput}
              onChange={(e) => setIterateInput(e.target.value)}
            />
            <button
              type="button"
              onClick={handleIterate}
              disabled={state.isIterating || !state.optimizedPrompt || !iterateInput.trim()}
              className="theme-button-secondary px-3 py-1.5 rounded text-sm disabled:opacity-50"
            >
              {state.isIterating ? "迭代中..." : "提交迭代"}
            </button>
          </div>
        </details>
      </div>
    </section>
  );
}
