import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

export const sql = neon(process.env.DATABASE_URL);

let ready;
function init() {
  ready ??= (async () => {
    // iv + ct are the encrypted note. The server can't read them.
    await sql`create table if not exists tape (
      id bigserial primary key,
      iv text not null,
      ct text not null,
      created_at timestamptz not null default now(),
      read_at timestamptz,
      saved boolean not null default false
    )`;
    await sql`create table if not exists tape_fails (at timestamptz not null default now())`;
  })().catch(e => { ready = undefined; throw e; });
  return ready;
}

/**
 * Checks the access token sent by the page (derived from your shared code).
 * Wrong token → plain 404, as if nothing were here.
 * More than 30 wrong tries in 15 minutes → everything is refused for a while.
 */
export async function guard(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  await init();

  const [{ n }] = await sql`select count(*)::int as n from tape_fails where at > now() - interval '15 minutes'`;
  if (n >= 30) { res.status(404).end(); return false; }

  const token = String(req.headers['x-k'] || '');
  const expected = String(process.env.ACCESS_HASH || '').trim().toLowerCase();
  const got = crypto.createHash('sha256').update(token).digest('hex');
  const ok = /^[0-9a-f]{64}$/.test(expected) && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));

  if (!ok) {
    await sql`insert into tape_fails default values`;
    await sql`delete from tape_fails where at < now() - interval '1 day'`;
    res.status(404).end();
    return false;
  }
  return true;
}

export const isB64 = (s, max) => typeof s === 'string' && s.length > 0 && s.length <= max && /^[A-Za-z0-9+/=]+$/.test(s);
