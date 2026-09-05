-- V24.2: this schema is created automatically by _worker.js.
-- This file remains only as documentation/manual fallback.

CREATE TABLE IF NOT EXISTS difor_sync_revisions_v242 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS difor_sync_records_v242 (
  tenant TEXT NOT NULL,
  store TEXT NOT NULL,
  record_id TEXT NOT NULL,
  payload TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant, store, record_id)
);

CREATE INDEX IF NOT EXISTS idx_difor_v242_tenant_revision
  ON difor_sync_records_v242 (tenant, revision);

CREATE INDEX IF NOT EXISTS idx_difor_v242_tenant_updated
  ON difor_sync_records_v242 (tenant, updated_at);
