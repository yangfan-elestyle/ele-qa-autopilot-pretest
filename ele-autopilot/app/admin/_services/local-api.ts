/**
 * Local API 客户端
 *
 * 用于前端直接调用 ele-autopilot-local 的接口
 */

import { getAgentUrl } from '../_hooks/use-agent-connection';
import type { JobConfig } from '../_types';

type TaskInput = {
  id: string;
  text: string;
};

type LocalRunRequest = {
  job_id: string;
  tasks: TaskInput[];
  callback_url: string;
  config: JobConfig;
  // 集成中心下发的 Gemini key (1.21.0+); 与 config 同级展开到顶层 payload.
  // 由 ele-autopilot-local JobConfig.llm_api_key 接收, 详见 ele-autopilot-local/autopilot/config.py.
  llm_api_key?: string;
};

// Local API 实际需要的请求体（config 字段展开到顶层）
type LocalRunPayload = Omit<LocalRunRequest, 'config' | 'llm_api_key'> &
  JobConfig & { llm_api_key?: string };

type LocalRunResponse = {
  code: number;
  message: string;
  data: {
    job_id: string;
    status: string;
  } | null;
};

// 本地 agent 无网络等待, 但浏览器冷启动 / Chrome user data dir 解锁慢时 dispatch
// 可能要 10s+. 30s 给一份余量, 同时确保用户 hang 时 UI 30s 内能弹错而不是
// 永远 spinner. stop / connect 走静态路径, 短超时.
const FETCH_TIMEOUT_DISPATCH_MS = 30_000;
const FETCH_TIMEOUT_STOP_MS = 10_000;
const FETCH_TIMEOUT_CONNECT_MS = 5_000;

/**
 * 下发任务到 Local
 *
 * @param request 任务下发请求
 * @returns 响应数据
 */
export async function dispatchToLocal(request: LocalRunRequest): Promise<LocalRunResponse> {
  const agentUrl = getAgentUrl();

  // Local API 期望 config 字段展开到顶层（AutopilotRunRequest 继承自 JobConfig）.
  // llm_api_key 同级展开, 但不放进 config 防止重复 / 顺序歧义.
  const { config, llm_api_key, ...rest } = request;
  const payload: LocalRunPayload = {
    ...rest,
    ...config,
    ...(llm_api_key ? { llm_api_key } : {}),
  };

  let response: Response;
  try {
    response = await fetch(`${agentUrl}/autopilot/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_DISPATCH_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error(
        `Local API 超时 (>${FETCH_TIMEOUT_DISPATCH_MS / 1000}s), 请确认本地 agent 是否响应`,
        { cause: err },
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new Error(`Local API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

type StopJobResponse = {
  code: number;
  message: string;
  data: {
    success: boolean;
    message: string;
    task_id: string | null;
    task_index: number | null;
  } | null;
};

/**
 * 停止 Local 上正在执行的 Job 或指定 Task
 *
 * @param jobId Job ID
 * @param taskId 可选，传入则只停止该 task，不传则停止整个 Job
 */
export async function stopJobOnLocal(jobId: string, taskId?: string): Promise<StopJobResponse> {
  const agentUrl = getAgentUrl();

  let response: Response;
  try {
    response = await fetch(`${agentUrl}/autopilot/jobs/${jobId}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskId ? { task_id: taskId } : {}),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_STOP_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error(
        `Local API 超时 (>${FETCH_TIMEOUT_STOP_MS / 1000}s), 请确认本地 agent 是否响应`,
        { cause: err },
      );
    }
    throw err;
  }

  if (!response.ok) {
    const error = (await response
      .json()
      .catch(() => ({ message: 'Unknown error' }))) as { message?: string };
    throw new Error(error.message || `Local API error: ${response.status}`);
  }

  return response.json();
}

/**
 * 检测 Local 连接状态
 *
 * @returns 是否连接成功
 */
export async function checkLocalConnection(): Promise<boolean> {
  const agentUrl = getAgentUrl();

  try {
    const response = await fetch(`${agentUrl}/system/connect`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_CONNECT_MS),
    });

    if (!response.ok) return false;

    const result = (await response.json()) as { code: number };
    return result.code === 0;
  } catch {
    // 包括 TimeoutError / NetworkError / 任何非预期异常: 一律视为未连接.
    // 不向 UI 抛, checkLocalConnection 是轮询性接口, 不应让一次失败把
    // 整个 useAgentConnection hook 崩成 error 态.
    return false;
  }
}
