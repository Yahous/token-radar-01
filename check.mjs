// Local gate check for the token-radar-01 entry. Usage: node check.mjs <outdir> <snapshot.json>
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
const snapPath = process.argv[3];
let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
};

const snap = JSON.parse(readFileSync(snapPath, 'utf8'));
const board = JSON.parse(readFileSync(join(out, 'board.json'), 'utf8'));
const rows = board.rows;
const slugs = new Set(snap.protocols.map((p) => p.slug));
const watch = snap.watchlist;

ok(Array.isArray(rows) && rows.length >= 100 && rows.length <= 4000, `board rows ${rows.length} in 100..4000`);
ok(statSync(join(out, 'board.json')).size <= 8 * 1024 * 1024, 'board.json <= 8 MiB');
const ranks = rows.map((r) => r.rank).sort((a, b) => a - b);
ok(ranks.every((r, i) => r === i + 1), 'ranks exactly 1..N');
ok(rows.every((r, i) => i === 0 || r.implied_value_usd <= rows[i - 1].implied_value_usd), 'implied values non-increasing by rank');
ok(!(rows.length >= 2 && rows[0].implied_value_usd === rows[rows.length - 1].implied_value_usd), 'implied values not all equal');
const rowSlugs = new Set(rows.map((r) => r.slug));
ok(rowSlugs.size === rows.length, 'slugs unique');
ok(rows.every((r) => slugs.has(r.slug)), 'every slug in snapshot');
ok(watch.every((s) => rowSlugs.has(s)), `watchlist covered ${watch.filter((s) => rowSlugs.has(s)).length}/${watch.length}`);
ok(
  rows.every(
    (r) =>
      typeof r.name === 'string' &&
      r.name.length > 0 &&
      Number.isSafeInteger(r.implied_value_usd) &&
      r.implied_value_usd > 0 &&
      r.implied_value_usd <= 1e14,
  ),
  'name/implied value shape',
);
ok(
  rows.every((r) => Array.isArray(r.farm_steps) && r.farm_steps.length >= 3 && r.farm_steps.length <= 12 && r.farm_steps.every((s) => typeof s === 'string' && s.trim().length >= 20 && s.trim().length <= 600)),
  'farm_steps 3..12, each 20..600 chars',
);
// Farm steps should not all be identical across rows.
const distinctPlans = new Set(rows.map((r) => r.farm_steps.join('|')));
ok(distinctPlans.size > rows.length * 0.5, `farm plans distinct: ${distinctPlans.size}/${rows.length}`);
// Implied value recompute check against the model formula in the dashboard's terms.
const top5 = rows.slice(0, 5).map((r) => `${r.rank}. ${r.name} $${r.implied_value_usd.toLocaleString('en-US')}`);
console.log('TOP5:', top5.join(' | '));

// Dashboard checks.
const dash = join(out, 'dashboard');
const files = readdirSync(dash);
ok(files.includes('index.html'), 'dashboard has index.html');
ok(files.some((f) => f.endsWith('.css')), 'dashboard has a .css');
ok(files.some((f) => f.endsWith('.js')), 'dashboard has a .js');
const total = files.reduce((n, f) => n + statSync(join(dash, f)).size, 0);
ok(files.length <= 400 && total <= 4 * 1024 * 1024, `dashboard ${files.length} files, ${total} bytes`);
ok(total <= 65536, `dashboard source ${total} bytes <= 64 KiB (dossier reads it whole)`);
const attrHttp = /<(?:a|link|script|img|iframe)[^>]*(?:href|src|action)\s*=\s*["']https?:/i;
const styleHttp = /<style[^>]*>[\s\S]*?https?:/i;
const cssHttp = /https?:\/\//;
for (const f of files) {
  const text = readFileSync(join(dash, f), 'utf8');
  if (f.endsWith('.html')) {
    ok(!attrHttp.test(text), `${f}: no http(s) in HTML attribute values`);
    ok(!styleHttp.test(text), `${f}: no http(s) in <style> body`);
  }
  if (f.endsWith('.css')) ok(!cssHttp.test(text), `${f}: no http(s) in CSS`);
  if (f.endsWith('.js')) {
    ok(!/(?:import|require|from)\s*\(?\s*["']https?:/.test(text) && !/import\(["']https?:/.test(text), `${f}: no http(s) in JS imports`);
  }
}
// Screenshots.
const shots = readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.'));
ok(shots.length >= 3 && shots.length <= 4, `screenshots: ${shots.length}`);
for (const f of shots) {
  const b = readFileSync(join(out, 'screenshots', f));
  ok(b.length <= 512 * 1024, `${f}: ${b.length} bytes <= 512 KiB`);
}
// Dossier matches: rebuild with the vendored library and compare bytes.
const { buildDossier } = await import('./vendor/makefun-board.ts');
const rebuilt = buildDossier(out, { text_max_bytes: 65536, screenshots: { max: 4, max_bytes: 524288 }, dashboard: { max_files: 400, max_bytes: 4194304 } });
const onDisk = readFileSync(join(out, 'dossier.json'));
ok(Buffer.compare(Buffer.from(rebuilt), onDisk) === 0, `dossier.json matches buildDossier (${onDisk.length} bytes)`);
const dossier = JSON.parse(onDisk.toString('utf8'));
ok(!dossier.text.includes('left out'), 'dossier text shows every dashboard file whole (nothing cut)');
console.log(fails === 0 ? 'ALL CHECKS PASSED' : `${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
