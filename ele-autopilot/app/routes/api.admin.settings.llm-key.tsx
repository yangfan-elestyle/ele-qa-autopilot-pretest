import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { getLlmApiKey, setLlmApiKey } from '@/lib/db';
import { jsonError, jsonResponse, methodNotAllowed } from '@/app/lib/api-shared';

// key 长度 < 8 时全 mask, 否则 "前4...后4" (避免暴露中段).
function maskKey(value: string): string {
  if (!value) return '';
  if (value.length < 8) return '***';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

// GET ?raw=1 → { value: string } 明文; 默认 → { has_key, masked }.
// raw 仅供 dispatch 链路用; 不暴露公网 (走 /api/admin/* 由 gateway Access 保护).
export async function loader({ request }: LoaderFunctionArgs) {
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

// PUT { value: string } 写入; 空字符串视作清除.
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'PUT') return methodNotAllowed(['PUT']);

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
