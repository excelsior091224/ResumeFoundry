CREATE TABLE deleted_user_tombstones (
  user_id_hash TEXT PRIMARY KEY,
  deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deleted_user_tombstones_deleted_at ON deleted_user_tombstones(deleted_at);
