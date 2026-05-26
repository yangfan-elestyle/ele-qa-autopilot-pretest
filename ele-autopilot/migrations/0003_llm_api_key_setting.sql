-- 新增 settings.llm_api_key: 集成中心下发 Gemini API key 给 ele-autopilot-local.
-- 不动表结构, 仅追加一行; 已存在时跳过避免覆盖运行时设置.
INSERT OR IGNORE INTO settings (key, value) VALUES ('llm_api_key', '');
