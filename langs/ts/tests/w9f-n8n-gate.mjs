// The typed reading's cost on a large project (lane w9f-n8n-gate): on n8n's cli project (4,835 files) the reading before
// the first unit took 465 s and 7.3 GB of a pull request's 557 s preamble, every program parsing the whole project anew
// and every unit emitting its whole reach. Two mechanisms, each with its check on tests/fixtures/w9f-typed (a.ts
// imported by eight files; unit f changes what runs, unit g only gains a return annotation):
//   w9f-typed-reuse  typed.mjs sideProgram: a program with an old program takes the old one's SourceFile for every file
//                    of the same text, so the parent side and each unit's reverted head parse only the changed file
//   w9f-typed-first  typed.mjs: a unit's reading stops at its first differing file, its own file read first, so a unit
//                    whose change runs costs two emits, not its whole reach (an erased unit still reads the whole reach)
//   w9f-lint-routed  pr.mjs changedUnits: only the units the ledger routes to are linted (tests/fixtures/w9f-lint: five
//                    units, f1 routed), where every unit of every changed file was linted and all but the routed dropped
// Each leaves every decision as it was: f is not erased, g is, the file's emit differs, f1's findings are the same, in
// every mode.
//
//   node tests/w9f-n8n-gate.mjs              the checks, then each break (each must turn its check red)
//   node tests/w9f-n8n-gate.mjs --break <m>  one mechanism removed: its check is red, exit 1 (as it must be)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { typedReading, typedReuse } from '../typed.mjs';
import { loadProgram } from '../common.mjs';
import { changedUnits } from '../pr.mjs';
import { lintStats } from '../lint/lint.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, 'fixtures', 'w9f-typed');
const parent = fs.readFileSync(path.join(root, 'a.parent.ts'), 'utf8'), head = fs.readFileSync(path.join(root, 'src', 'a.ts'), 'utf8');
const BREAKS = { 'w9f-typed-reuse': 'reuse', 'w9f-typed-first': 'first', 'w9f-lint-routed': 'lint-routed' };
const lintFixture = path.join(here, 'fixtures', 'w9f-lint', 'src', 'm.ts');
const lintLoaded = loadProgram(lintFixture, { project: true });

function read(units) {
  Object.assign(typedReuse, { reused: 0, parsed: 0, emits: 0 });
  const t = typedReading({ root, project: true, changes: [{ rel: 'src/a.ts', parent, head, units }] }).get('src/a.ts');
  return { t, ...typedReuse };
}
function checks() {
  const out = [];
  const both = read(['f', 'g']), file = read([]), f = read(['f']);
  // the decisions, whatever the mechanisms: the file's emit differs (f), f is not erased, g is
  out.push({ check: 'decisions', ok: both.t.equal === false && both.t.files === 9 && both.t.units?.f?.equal === false && both.t.units?.g?.equal === true && both.t.units.g.differs.length === 0,
    detail: JSON.stringify({ equal: both.t.equal, files: both.t.files, units: both.t.units }) });
  // reuse: three programs have an old program (the parent side, f's and g's reverted heads); each parses a.ts alone
  out.push({ check: 'reuse', ok: both.parsed === 3 && both.reused > 0, detail: `parsed ${both.parsed} reused ${both.reused} (want parsed 3)` });
  // first difference: f's reading past the file's own costs its own file in the reverted head and in the head: 2 emits
  out.push({ check: 'first', ok: f.emits - file.emits === 2 && f.t.units.f.differs.length === 1 && f.t.units.f.first === true, detail: `unit f emitted ${f.emits - file.emits} file(s) (want 2), differs ${JSON.stringify(f.t.units.f.differs)}` });
  // lint-routed: the ledger routes f1 alone, so one lint call; f1's findings are the ones every unit's lint gives it
  lintStats.calls = 0;
  const kept = changedUnits(lintLoaded, [[1, Infinity]], lintFixture, new Set(['f1'])).filter((u) => u.name === 'f1');
  const calls = lintStats.calls;
  const whole = changedUnits({ ...lintLoaded }, [[1, Infinity]], lintFixture).filter((u) => u.name === 'f1');
  const rules = (us) => JSON.stringify(us.map((u) => u.findings.map((x) => [x.rule, x.line])));
  out.push({ check: 'decisions', ok: rules(kept) === rules(whole) && rules(kept) === JSON.stringify([[['non-null-assertion', 1]]]), detail: `f1 kept ${rules(kept)} every unit ${rules(whole)}` });
  out.push({ check: 'lint-routed', ok: calls === 1, detail: `lint calls ${calls} for one routed unit of five (want 1)` });
  return out;
}

const i = process.argv.indexOf('--break'), only = i >= 0 ? process.argv[i + 1] : null;
if (only) {
  if (!BREAKS[only]) { console.error(`--break: one of ${Object.keys(BREAKS).join(', ')}`); process.exit(2); }
  process.env.LEAN_BREAK = only;
  const rs = checks(), red = rs.filter((r) => !r.ok);
  for (const r of red) console.log(`red: ${r.check}: ${r.detail}`);
  console.log(`--break ${only}: ${red.length} of ${rs.length} check(s) red`);
  process.exit(red.length ? 1 : 0);
}
const lines = [];
let failed = false;
const green = checks();
for (const r of green) { if (!r.ok) { failed = true; console.log(`FAIL ${r.check}: ${r.detail}`); } }
lines.push(`${green.filter((r) => r.ok).length}/${green.length}`);
for (const [m, check] of Object.entries(BREAKS)) {
  process.env.LEAN_BREAK = m;
  const rs = checks(), red = rs.filter((r) => !r.ok).map((r) => r.check);
  // the break turns its own check red and leaves the decisions as they were
  if (!red.includes(check) || red.includes('decisions')) { failed = true; console.log(`FAIL --break ${m}: red ${JSON.stringify(red)} (want ${check}, never decisions)`); }
  lines.push(`--break ${m} ${red.join(',') || 'none'} red`);
}
delete process.env.LEAN_BREAK;
console.log(`w9f-n8n-gate: ${lines.join('; ')}${failed ? ' — FAILED' : ''}`);
process.exit(failed ? 1 : 0);
