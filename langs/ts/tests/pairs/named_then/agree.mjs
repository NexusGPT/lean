// the two deciders on every unit: the lint's verdict and the translator's (--tolerant, per unit) agree on each unit of the
// named handler pair and of the escape that refuses a named handler: admitted by both, or refused by both by one rule name.
// usage: node langs/ts/tests/pairs/named_then/agree.mjs [file.ts ...]   (default: parent.ts, candidate.ts and the escape)
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../../../..');
const files = process.argv.slice(2).length ? process.argv.slice(2) : [path.join(here, 'parent.ts'), path.join(here, 'candidate.ts'), path.join(root, 'fixtures/escapes/ts/promise_handler.ts')];
const node = (args) => spawnSync('node', args, { encoding: 'utf8' });
let disagree = 0;
for (const file of files) {
  const units = JSON.parse(node([path.join(root, 'langs/ts/units.mjs'), file, '--no-project']).stdout);
  const list = Array.isArray(units) ? units : units.units;
  const lint = node([path.join(root, 'langs/ts/lint/lint.mjs'), file]);
  const found = [...(lint.stdout + lint.stderr).matchAll(/:(\d+):\d+\s+(\S+)\s/g)].map((m) => ({ line: Number(m[1]), rule: m[2] }));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'named-then-')), rep = path.join(tmp, 'report.json');
  node([path.join(root, 'langs/ts/translate/translate.mjs'), file, '--core', '--tolerant', '--report', rep, '--out', path.join(tmp, 'out.dfy'), '--no-project']);
  const report = fs.existsSync(rep) ? JSON.parse(fs.readFileSync(rep, 'utf8')) : { lintedOut: [], translated: [], failed: [] };
  const name = (x) => (typeof x === 'string' ? x : x.unit ?? x.name);
  for (const u of list) {
    const hit = found.find((f) => f.line >= u.start && f.line <= u.end);
    const lintSays = hit ? `refused ${hit.rule}` : 'admitted';
    const out = report.lintedOut.find((x) => name(x) === u.name), failed = report.failed.find((x) => name(x) === u.name);
    const trSays = failed ? `failed ${String(failed.msg ?? failed.error ?? JSON.stringify(failed)).slice(0, 90)}` : out ? `refused ${out.rule}` : report.translated.some((x) => name(x) === u.name) ? 'admitted' : 'absent';
    const ok = lintSays === trSays;
    if (!ok) disagree++;
    console.log(`${ok ? 'agree   ' : 'DISAGREE'} ${path.basename(file)} ${u.name}: lint ${lintSays} | translator ${trSays}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(disagree ? `${disagree} unit(s) where the two deciders disagree` : 'the lint and the translator agree on every unit');
process.exit(disagree ? 1 : 0);
