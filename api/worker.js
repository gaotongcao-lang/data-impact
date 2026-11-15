// Data^Impact likes and comments API (Cloudflare Worker + D1).
// Bindings: DB (D1 database). Optional secret: TURNSTILE_SECRET (enables the anti-bot check).
// Routes:
//   GET  /api/engage?page=blog/one-light-day-away   -> { likes, liked, comments: [...] }
//   POST /api/like     { page, visitor, like: true|false }
//   POST /api/comment  { page, visitor, name, body, website, token }

const ALLOWED_ORIGINS = [
  'https://data-impact.pages.dev',
  'https://preview.data-impact.pages.dev',
  'http://localhost:8765',
];
const PAGE_RE = /^(projects|blog)\/[a-z0-9-]{1,80}$/;
const VISITOR_RE = /^[a-zA-Z0-9-]{16,64}$/;
const MAX_NAME = 60;
const MAX_BODY = 2000;
const COMMENTS_PER_10_MIN = 5;

function cors(request) {
  const origin = request.headers.get('Origin') || '';
  const ok = ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.data-impact\.pages\.dev$/.test(origin);
  return ok ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  } : { 'Vary': 'Origin' };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(request) },
  });
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function clean(text, max) {
  return String(text || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true; // check is switched off until the secret is set
  if (!token) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const out = await res.json().catch(() => ({}));
  return out.success === true;
}

async function getEngage(env, page, visitor) {
  const likes = await env.DB.prepare('SELECT COUNT(*) AS n FROM likes WHERE page = ?').bind(page).first();
  const liked = VISITOR_RE.test(visitor || '')
    ? await env.DB.prepare('SELECT 1 AS y FROM likes WHERE page = ? AND visitor = ?').bind(page, visitor).first()
    : null;
  const { results } = await env.DB.prepare(
    'SELECT id, name, body, created_at FROM comments WHERE page = ? AND hidden = 0 ORDER BY id DESC LIMIT 200'
  ).bind(page).all();
  return { likes: likes ? likes.n : 0, liked: !!liked, comments: results || [] };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request) });

    try {
      if (url.pathname === '/api/engage' && request.method === 'GET') {
        const page = url.searchParams.get('page') || '';
        if (!PAGE_RE.test(page)) return json(request, { error: 'bad page' }, 400);
        return json(request, await getEngage(env, page, url.searchParams.get('visitor')));
      }

      if (request.method !== 'POST') return json(request, { error: 'not found' }, 404);
      if (!cors(request)['Access-Control-Allow-Origin']) return json(request, { error: 'origin not allowed' }, 403);
      const data = await request.json().catch(() => null);
      if (!data || !PAGE_RE.test(data.page || '')) return json(request, { error: 'bad page' }, 400);
      if (!VISITOR_RE.test(data.visitor || '')) return json(request, { error: 'bad visitor' }, 400);

      if (url.pathname === '/api/like') {
        if (data.like === false) {
          await env.DB.prepare('DELETE FROM likes WHERE page = ? AND visitor = ?').bind(data.page, data.visitor).run();
        } else {
          await env.DB.prepare('INSERT OR IGNORE INTO likes (page, visitor) VALUES (?, ?)').bind(data.page, data.visitor).run();
        }
        return json(request, await getEngage(env, data.page, data.visitor));
      }

      if (url.pathname === '/api/comment') {
        if (data.website) return json(request, { ok: true }); // honeypot: bots fill the hidden field
        const name = clean(data.name, MAX_NAME);
        const body = clean(data.body, MAX_BODY);
        if (!name || !body) return json(request, { error: 'Please add your name and a comment.' }, 400);
        const ip = request.headers.get('CF-Connecting-IP') || '';
        if (!(await verifyTurnstile(env, data.token, ip))) return json(request, { error: 'Verification failed. Please try again.' }, 403);
        const ipHash = await sha256(ip + '|data-impact');
        const recent = await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM comments WHERE ip_hash = ? AND created_at > datetime('now', '-10 minutes')"
        ).bind(ipHash).first();
        if (recent && recent.n >= COMMENTS_PER_10_MIN) return json(request, { error: 'Too many comments. Please wait a few minutes.' }, 429);
        await env.DB.prepare('INSERT INTO comments (page, name, body, ip_hash) VALUES (?, ?, ?, ?)').bind(data.page, name, body, ipHash).run();
        return json(request, await getEngage(env, data.page, data.visitor));
      }

      return json(request, { error: 'not found' }, 404);
    } catch (err) {
      return json(request, { error: 'Server error. Please try again later.' }, 500);
    }
  },
};
