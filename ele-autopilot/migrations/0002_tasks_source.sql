-- Migration number: 0002 	 2026-05-20T09:57:00.924Z
-- 加 source 标识 task 来源 (manual = web UI 录入 / 外部 ingest 任意值).
-- 默认 'manual' 兼容历史数据与 web UI 创建路径; 不加 unique / external_id (本期不做幂等).

ALTER TABLE tasks ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
