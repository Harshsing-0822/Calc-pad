import { sql, guard } from './_lib.js';

export default async function handler(req, res) {
  try {
    if (!(await guard(req, res))) return;
    if (req.method !== 'POST') return res.status(405).end();

    const { action, ids } = req.body || {};
    if (!Array.isArray(ids) || !ids.length || ids.length > 300 || !ids.every(Number.isSafeInteger)) {
      return res.status(400).end();
    }

    if (action === 'read')        await sql`update tape set read_at = now() where id = any(${ids}::bigint[]) and read_at is null`;
    else if (action === 'save')   await sql`update tape set saved = true  where id = any(${ids}::bigint[])`;
    else if (action === 'unsave') await sql`update tape set saved = false, read_at = coalesce(read_at, now()) where id = any(${ids}::bigint[])`;
    else if (action === 'delete') await sql`delete from tape where id = any(${ids}::bigint[])`;
    else return res.status(400).end();

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
}
