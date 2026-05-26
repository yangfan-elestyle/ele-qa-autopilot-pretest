import type { JobConfig, SettingRow } from './types';
import { queryGet, queryRun } from './utils';

export async function getSetting(key: string): Promise<SettingRow | null> {
  return await queryGet<SettingRow>(
    `SELECT key, value, updated_at FROM settings WHERE key = ?`,
    [key],
  );
}

export async function setSetting(key: string, value: string): Promise<SettingRow> {
  const now = new Date().toISOString();
  await queryRun(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now],
  );
  return { key, value, updated_at: now };
}

const AGENT_CONFIG_KEY = 'agent_config';

export async function getAgentConfig(): Promise<JobConfig> {
  const setting = await getSetting(AGENT_CONFIG_KEY);
  if (!setting) {
    throw new Error('Agent config not found in database');
  }
  return JSON.parse(setting.value) as JobConfig;
}

export async function setAgentConfig(config: JobConfig): Promise<JobConfig> {
  await setSetting(AGENT_CONFIG_KEY, JSON.stringify(config));
  return config;
}

export const LLM_API_KEY_KEY = 'llm_api_key';

// 集成中心下发给 ele-autopilot-local 的 Gemini key.
// migration 0003 已插入空字符串作为默认; 空字符串视作"未配置".
export async function getLlmApiKey(): Promise<string> {
  const setting = await getSetting(LLM_API_KEY_KEY);
  return setting?.value ?? '';
}

export async function setLlmApiKey(value: string): Promise<void> {
  await setSetting(LLM_API_KEY_KEY, value);
}
