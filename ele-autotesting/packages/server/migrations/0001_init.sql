-- schema for remote storage (libSQL / SQLite). Mirrors IStorageProvider's KV semantics.
-- owner_id prefix encodes identity source: 'device:<uuid>' (V1), 'google:<sub>' (V2).

CREATE TABLE IF NOT EXISTS storage (
  owner_id   TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (owner_id, key)
);

CREATE INDEX IF NOT EXISTS idx_storage_owner_updated
  ON storage(owner_id, updated_at);
