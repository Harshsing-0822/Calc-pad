// Usage:  node scripts/make-hash.mjs 2911202406
// Prints the ACCESS_HASH value to put in Vercel's environment variables.
// It reads SALT/ITER straight from index.html so they can never get out of sync.
import { readFileSync } from 'node:fs';
import { webcrypto as crypto, createHash } from 'node:crypto';

const code = (process.argv[2] || '').trim();
if (!/^\d{8,}$/.test(code)) {
  console.error('Give your secret code as digits only, at least 8 (10+ is better).\n  e.g.  node scripts/make-hash.mjs 2911202406');
  process.exit(1);
}

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SALT = html.match(/const SALT = '([^']+)'/)[1];
const ITER = Number(html.match(/const ITER = (\d+)/)[1]);

const te = new TextEncoder();
const base = await crypto.subtle.importKey('raw', te.encode(code), 'PBKDF2', false, ['deriveBits']);
const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: te.encode(SALT), iterations: ITER, hash: 'SHA-256' }, base, 512));
const token = Buffer.from(bits.slice(32)).toString('hex');

console.log('\nACCESS_HASH=' + createHash('sha256').update(token).digest('hex') + '\n');
