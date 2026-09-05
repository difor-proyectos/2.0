const json = (body, status = 200, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extraHeaders
  }
});

const bad = (status, text) => new Response(text, {
  status,
  headers: {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  }
});

const enc = new TextEncoder();
const dbOf = env => env.DIFOR_DB || env.DB || null;
const bucketOf = env => env.DIFOR_FILES || env.BUCKET || null;
const workspaceOf = env => String(env.DIFOR_WORKSPACE_ID || 'difor-castro-axel').trim() || 'difor-castro-axel';

async function sha256Hex(value) {
  const bytes = typeof value === 'string' ? enc.encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function browserSameOrigin(request) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if (origin && origin !== url.origin) return false;
  if (site && !['same-origin', 'same-site', 'none'].includes(site)) return false;
  return true;
}

function dataUrlInfo(value) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(value || '');
  if (!m) return null;
  return { mime: m[1] || 'application/octet-stream', base64: Boolean(m[2]), data: m[3] || '' };
}

function extFor(mime) {
  return ({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'image/svg+xml': 'svg'
  })[mime] || 'bin';
}

function decodeDataUrl(info) {
  if (!info.base64) return enc.encode(decodeURIComponent(info.data));
  const raw = atob(info.data);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function safePart(value) {
  return String(value || 'item').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 90) || 'item';
}

async function externalize(value, ctx) {
  if (typeof value === 'string') {
    if (!value.startsWith('data:') || value.length < 20000) return value;
    if (!ctx.bucket) return '';
    const info = dataUrlInfo(value);
    if (!info) return value;
    const bytes = decodeDataUrl(info);
    const hash = await sha256Hex(bytes);
    const tenantHash = (await sha256Hex(ctx.tenant)).slice(0, 24);
    const key = `difor/${tenantHash}/${safePart(ctx.store)}/${safePart(ctx.id)}/${hash}.${extFor(info.mime)}`;
    await ctx.bucket.put(key, bytes, {
      httpMetadata: { contentType: info.mime, cacheControl: 'private, max-age=31536000, immutable' },
      customMetadata: { workspace: ctx.tenant.slice(0, 80), store: String(ctx.store), recordId: String(ctx.id) }
    });
    return `/api/asset?key=${encodeURIComponent(key)}`;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) out.push(await externalize(item, ctx));
    return out;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = await externalize(v, ctx);
    return out;
  }
  return value;
}

const SYNC_RECORDS_TABLE = 'difor_sync_records_v242';
const SYNC_REVISIONS_TABLE = 'difor_sync_revisions_v242';
let schemaReadyPromise = null;

async function ensureSchema(db) {
  if (!db) throw new Error('D1_BINDING_MISSING');
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    // V24.2 uses its own versioned tables. This deliberately avoids depending on
    // any incomplete/legacy sync_records table left by older deployments.
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS ${SYNC_REVISIONS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS ${SYNC_RECORDS_TABLE} (
        tenant TEXT NOT NULL,
        store TEXT NOT NULL,
        record_id TEXT NOT NULL,
        payload TEXT,
        updated_at INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0,
        revision INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (tenant, store, record_id)
      )
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_difor_v242_tenant_revision
      ON ${SYNC_RECORDS_TABLE} (tenant, revision)
    `).run();

    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_difor_v242_tenant_updated
      ON ${SYNC_RECORDS_TABLE} (tenant, updated_at)
    `).run();

    return true;
  })().catch(error => {
    // Let a later request retry if D1 had a transient failure.
    schemaReadyPromise = null;
    throw error;
  });

  return schemaReadyPromise;
}

async function nextRevision(db, tenant) {
  await ensureSchema(db);
  const result = await db.prepare(`INSERT INTO ${SYNC_REVISIONS_TABLE} (tenant, created_at) VALUES (?, ?)`).bind(tenant, Date.now()).run();
  return Number(result?.meta?.last_row_id || 0);
}

async function syncGet(request, env) {
  const db = dbOf(env), bucket = bucketOf(env), tenant = workspaceOf(env), url = new URL(request.url);
  if (!db) return json({ ok: false, error: 'D1_BINDING_MISSING' }, 500);
  await ensureSchema(db);

  if (![...url.searchParams.keys()].length) {
    return json({
      ok: true,
      service: 'difor-sync-v24.2-self-init',
      workspace: tenant,
      d1: true,
      r2: Boolean(bucket),
      schema: 'auto-v24.2',
      tables: [SYNC_RECORDS_TABLE, SYNC_REVISIONS_TABLE],
      methods: ['GET', 'POST', 'OPTIONS']
    });
  }

  if (!browserSameOrigin(request)) return json({ ok: false, error: 'FORBIDDEN' }, 403);

  if (url.searchParams.get('meta') === '1') {
    const row = await db.prepare(`SELECT COUNT(*) AS count, COALESCE(MAX(revision),0) AS revision FROM ${SYNC_RECORDS_TABLE} WHERE tenant = ?`).bind(tenant).first();
    return json({ ok: true, count: Number(row?.count) || 0, revision: Number(row?.revision) || 0, r2: Boolean(bucket) });
  }

  const since = Math.max(0, Number(url.searchParams.get('since')) || 0);
  const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get('limit')) || 1000));
  const result = await db.prepare(`
    SELECT store, record_id AS id, payload, updated_at AS updatedAt, deleted, revision
    FROM ${SYNC_RECORDS_TABLE} WHERE tenant = ? AND revision > ? ORDER BY revision ASC LIMIT ?
  `).bind(tenant, since, limit).all();

  const records = (result.results || []).map(row => ({
    store: row.store,
    id: row.id,
    payload: row.payload ? JSON.parse(row.payload) : null,
    updatedAt: Number(row.updatedAt) || 0,
    deleted: Boolean(row.deleted),
    revision: Number(row.revision) || 0
  }));
  const maxRevision = records.reduce((m, r) => Math.max(m, r.revision || 0), since);
  return json({ ok: true, records, revision: maxRevision, cursor: maxRevision, hasMore: records.length === limit });
}

async function syncPost(request, env) {
  if (!browserSameOrigin(request)) return json({ ok: false, error: 'FORBIDDEN' }, 403);
  const db = dbOf(env), bucket = bucketOf(env), tenant = workspaceOf(env);
  if (!db) return json({ ok: false, error: 'D1_BINDING_MISSING' }, 500);
  await ensureSchema(db);

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'INVALID_BODY' }, 400); }

  const records = body?.records;
  if (!Array.isArray(records)) return json({ ok: false, error: 'INVALID_BODY' }, 400);
  if (records.length > 50) return json({ ok: false, error: 'TOO_MANY_RECORDS' }, 413);

  let accepted = 0;
  for (const item of records) {
    const store = String(item?.store || '').trim();
    const id = String(item?.id || '').trim();
    const updatedAt = Math.max(1, Number(item?.updatedAt) || Date.now());
    const deleted = Boolean(item?.deleted);
    if (!store || !id || store.length > 80 || id.length > 220) continue;

    const existing = await db.prepare(`SELECT updated_at AS updatedAt FROM ${SYNC_RECORDS_TABLE} WHERE tenant = ? AND store = ? AND record_id = ?`).bind(tenant, store, id).first();
    if (existing && Number(existing.updatedAt) > updatedAt) continue;

    let payload = null;
    if (!deleted) {
      if (!item.payload || typeof item.payload !== 'object') continue;
      const originalSize = enc.encode(JSON.stringify(item.payload)).byteLength;
      if (originalSize > 30_000_000) return json({ ok: false, error: 'RECORD_TOO_LARGE' }, 413);
      try { payload = await externalize(item.payload, { bucket, tenant, store, id }); }
      catch (error) {
        console.error(error);
        return json({ ok: false, error: error.code || 'ASSET_UPLOAD_FAILED' }, 500);
      }
    }

    const payloadText = payload ? JSON.stringify(payload) : null;
    if (payloadText && enc.encode(payloadText).byteLength > 1_700_000) return json({ ok: false, error: 'RECORD_TOO_LARGE' }, 413);
    const revision = await nextRevision(db, tenant);

    await db.prepare(`
      INSERT INTO ${SYNC_RECORDS_TABLE} (tenant,store,record_id,payload,updated_at,deleted,revision)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(tenant,store,record_id) DO UPDATE SET
        payload=excluded.payload, updated_at=excluded.updated_at, deleted=excluded.deleted, revision=excluded.revision
      WHERE excluded.updated_at >= ${SYNC_RECORDS_TABLE}.updated_at
    `).bind(tenant, store, id, payloadText, updatedAt, deleted ? 1 : 0, revision).run();
    accepted++;
  }

  return json({ ok: true, accepted });
}

async function syncRoute(request, env) {
  if (request.method === 'GET') return syncGet(request, env);
  if (request.method === 'POST') return syncPost(request, env);
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { allow: 'GET,POST,OPTIONS', 'cache-control': 'no-store' }
    });
  }
  return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405, { allow: 'GET,POST,OPTIONS' });
}

async function assetRoute(request, env) {
  if (request.method !== 'GET') return bad(405, 'METHOD_NOT_ALLOWED');
  const bucket = bucketOf(env);
  if (!bucket) return bad(500, 'R2_BINDING_MISSING');

  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';
  if (!/^difor\/[a-f0-9]{24}\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\/[a-f0-9]{64}\.[a-z0-9]+$/.test(key)) {
    return bad(400, 'INVALID_ASSET_KEY');
  }

  const object = await bucket.get(key);
  if (!object) return bad(404, 'NOT_FOUND');
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'private, max-age=86400');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(object.body, { headers });
}

async function serveAsset(request, env) {
  if (!env.ASSETS) return bad(500, 'ASSETS_BINDING_MISSING');
  const response = await env.ASSETS.fetch(request);
  if (response.status !== 404) return response;
  if (request.method !== 'GET') return response;
  const accept = request.headers.get('accept') || '';
  if (!accept.includes('text/html') && !accept.includes('*/*')) return response;
  const url = new URL(request.url);
  const indexRequest = new Request(`${url.origin}/index.html`, {
    method: 'GET',
    headers: request.headers
  });
  return env.ASSETS.fetch(indexRequest);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/sync' || url.pathname === '/api/sync/') return await syncRoute(request, env);
      if (url.pathname === '/api/asset' || url.pathname === '/api/asset/') return await assetRoute(request, env);
      return serveAsset(request, env);
    } catch (error) {
      console.error('DIFOR Worker error', error);
      if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'INTERNAL_ERROR', message: String(error?.message || error) }, 500);
      return serveAsset(request, env);
    }
  }
};
