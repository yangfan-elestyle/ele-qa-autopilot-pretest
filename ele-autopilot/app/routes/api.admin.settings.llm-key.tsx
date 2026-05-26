import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { requireAccessUser, requireEmailDomain } from '@/lib/access-auth';
import { getLlmApiKey, setLlmApiKey } from '@/lib/db';
import { jsonError, jsonResponse, methodNotAllowed } from '@/app/lib/api-shared';

// 长度 ≤ 8 全 mask, 否则 "前4...后4" (避免暴露中段).
function maskKey(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

// 仅允许 @elestyle.jp SSO 已登录用户. gateway `/api/*` 全段 bypass + Everyone,
// 业务 Worker 必须自己校验 CF Access cookie (浏览器从 Allow App 登录后携带 CF_Authorization).
const ALLOWED_EMAIL_SUFFIX = '@elestyle.jp';

async function guard(request: Request, env: Env): Promise<Response | null> {
  try {
    const user = await requireAccessUser(request, env);
    requireEmailDomain(user, ALLOWED_EMAIL_SUFFIX);
    return null;
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }
}

// GET ?raw=1 → { value: string } 明文; 默认 → { has_key, masked }.
// 两种形态都强制 SSO 校验, raw 不可对外暴露.
export async function loader({ request, context }: LoaderFunctionArgs) {
  const denied = await guard(request, context.cloudflare.env);
  if (denied) return denied;

  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get('raw') === '1';
    const value = await getLlmApiKey();

    if (raw) {
      return jsonResponse({ value }, { headers: NO_STORE_HEADERS });
    }
    return jsonResponse(
      { has_key: value.length > 0, masked: maskKey(value) },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error('Failed to get llm_api_key:', error);
    return jsonError('Failed to get llm_api_key', 500);
  }
}

// PUT { value: string } 写入; 空字符串视作清除. 同样强制 SSO.
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'PUT') return methodNotAllowed(['PUT']);

  const denied = await guard(request, context.cloudflare.env);
  if (denied) return denied;

  try {
    const body = (await request.json()) as { value?: unknown };
    if (typeof body?.value !== 'string') {
      return jsonError('value must be a string', 400);
    }
    await setLlmApiKey(body.value);
    return jsonResponse(
      { has_key: body.value.length > 0, masked: maskKey(body.value) },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error('Failed to update llm_api_key:', error);
    return jsonError('Failed to update llm_api_key', 500);
  }
}
