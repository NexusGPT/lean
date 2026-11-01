// Every behavioural fake's protocol test (exec/fakes/<module>.test.mjs), run twice: as written, every test must pass;
// with --break (the recording proxy alone answers, LEAN_FAKES=recording), every file must fail at least one test, so each
// protocol rests on its fake and not on the proxy. Exit 0 when both hold; the last line is the summary.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const files = fs.readdirSync(here).filter((f) => f.endsWith('.test.mjs')).sort();
const count = (text, k) => Number((text.match(new RegExp(`ℹ ${k} (\\d+)`)) ?? [0, NaN])[1]);
const rows = []; let ok = files.length > 0;
for (const f of files) {
  const run = (extra) => { const r = spawnSync(process.execPath, [path.join(here, f), ...extra], { encoding: 'utf8', env: { ...process.env, LEAN_FAKES: '' } }); const t = r.stdout + r.stderr; return { status: r.status, pass: count(t, 'pass'), fail: count(t, 'fail'), text: t }; };
  const a = run([]), b = run(['--break']);
  const good = a.status === 0 && a.fail === 0 && a.pass > 0 && b.status !== 0 && b.fail > 0;
  if (!good) { ok = false; if (a.fail || a.status) process.stderr.write(a.text.split('\n').filter((l) => /✖|Error|expected|actual/.test(l)).slice(0, 12).join('\n') + '\n'); }
  rows.push(`${f.replace('.test.mjs', '')} ${a.pass}/${a.pass + a.fail} (break: ${b.fail} red)`);
}
console.log(`FAKE PROTOCOLS: ${files.length} fakes, ${ok ? 'every protocol holds and every --break goes red' : 'FAILED'}: ${rows.join('; ')}`);
process.exit(ok ? 0 : 1);
