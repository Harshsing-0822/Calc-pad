import { sql, guard, isB64 } from './_lib.js';

// Notes are kept FOREVER unless one of you deletes them.
// Optional: set FADE_HOURS in Vercel (e.g. 24) to make read, unsaved notes vanish after that many hours.
const FADE = Number(process.env.FADE_HOURS) > 0 ? Number(process.env.FADE_HOURS) : 0;
const PAGE = 200;

const num = v => (Number.isSafeInteger(Number(v)) && Number(v) >= 0 ? Number(v) : null);

export default async function handler(req, res) {
  try {
    if (!(await guard(req, res))) return;

    if (req.method === 'GET') {
      if (FADE) {
        await sql`delete from tape where not saved and read_at is not null
                  and read_at < now() - make_interval(hours => ${FADE})`;
      }
      const q = req.query || {};

      // Load an older page (scrolling back in history)
      if (q.before != null) {
        const before = num(q.before) ?? 0;
        const rows = await sql`select id::int as id, iv, ct, created_at, read_at, saved
                               from tape where id < ${before} order by id desc limit ${PAGE + 1}`;
        const more = rows.length > PAGE;
        return res.status(200).json({ rows: rows.slice(0, PAGE).reverse(), more, fade: FADE });
      }

      // A cheap "has anything changed?" fingerprint, so polling every few seconds costs almost nothing.
      const [f] = await sql`select coalesce(max(id),0)::int as m, count(*)::int as c,
                              count(read_at)::int as r, count(*) filter (where saved)::int as s from tape`;
      const fp = `${f.m}.${f.c}.${f.r}.${f.s}`;
      if (q.fp === fp) return res.status(200).json({ same: true, fp, fade: FADE });

      // First open: newest page with full contents.
      if (q.from == null) {
        const rows = await sql`select id::int as id, iv, ct, created_at, read_at, saved
                               from tape order by id desc limit ${PAGE + 1}`;
        return res.status(200).json({ fp, rows: rows.slice(0, PAGE).reverse(), more: rows.length > PAGE, fade: FADE });
      }

      // Update: status of everything already on screen, plus full contents of anything new.
      const from = num(q.from) ?? 0, after = num(q.after) ?? 0;
      const rows = await sql`select id::int as id, created_at, read_at, saved,
                               case when id > ${after} then iv end as iv,
                               case when id > ${after} then ct end as ct
                             from tape where id >= ${from} order by id asc`;
      return res.status(200).json({ fp, rows, fade: FADE });
    }

    if (req.method === 'POST') {
      const { iv, ct } = req.body || {};
      if (!isB64(iv, 24) || !isB64(ct, 40000)) return res.status(400).end();
      const [row] = await sql`insert into tape (iv, ct) values (${iv}, ${ct}) returning id::int as id, created_at`;
      return res.status(200).json(row);
    }

    res.status(405).end();
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
}
