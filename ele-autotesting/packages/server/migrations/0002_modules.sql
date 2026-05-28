-- 集成中心 / 模块 (Module) 配置: 多行 path 列表, 区别于 storage 的 KV 形态.
-- 一个 owner 可配置任意多个模块, 每条模块本质是一条 path (形如 `/a/b`).
-- 生成测试用例时, 用户多选模块, 选中的 path 被注入到 LLM prompt 末尾.

CREATE TABLE IF NOT EXISTS modules (
  owner_id   TEXT NOT NULL,
  id         TEXT NOT NULL,
  path       TEXT NOT NULL,
  name       TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (owner_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_modules_owner_path
  ON modules(owner_id, path);

CREATE INDEX IF NOT EXISTS idx_modules_owner_updated
  ON modules(owner_id, updated_at);
