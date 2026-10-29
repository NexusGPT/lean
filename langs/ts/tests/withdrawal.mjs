// The admission contract (design/admission-contract.md), its withdrawal path: a reading withdrawn by name is refused by
// the lint and by the translator alike, with one rule and one reason, nothing crashes, and the check proves nothing; with
// the reading back, the same unit is admitted and proved. Beside it, the audit: every decision site of lint.mjs and
// translate.mjs belongs to a reading of the catalogue.
//   node langs/ts/tests/withdrawal.mjs        exit 0 when every assertion holds; one summary line
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lintFile } from '../lint/lint.mjs';
import { translate } from '../translate/translate.mjs';
import { lowerFile, auditSites } from '../lower.mjs';
import { withdraw, readingById, currentVersion } from '../readings.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pair = path.join(here, 'pairs/nested_ternary'); // `choose` is proved equal (expect.json: PASS-proved); it reads conditionals
const parent = path.join(pair, 'parent.ts'), candidate = path.join(pair, 'candidate.ts');
const unit = 'choose', reading = 'logic-values';
const reason = 'withdrawn by the withdrawal test: the conditional reading under review';
const version = currentVersion(readingById(reading));
const expectedMsg = `reading ${reading} version ${version} is withdrawn: ${reason}`;
const node = (args, env = {}) => spawnSync('node', args, { encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 1 << 26 });

// 1. before: the unit uses the reading, the lint admits it, the record has no refusal
const rec0 = lowerFile(parent);
const u0 = rec0.units.find((u) => u.unit === unit);
assert.ok(u0, 'the record holds the unit');
assert.ok(u0.readings.some((r) => r.id === reading), `the unit uses ${reading}`);
assert.equal(u0.refusal, null, 'admitted before the withdrawal');
assert.equal(lintFile(parent).filter((f) => !f.env && f.line >= u0.lines[0] && f.line <= u0.lines[1]).length, 0, 'the lint admits it before');

// 2. withdrawn in this process: the record, the lint and the translator refuse it with one rule and one reason
const restore = withdraw(reading, reason);
let lintMsg, translateMsg;
try {
  const rec = lowerFile(parent);
  const u = rec.units.find((x) => x.unit === unit);
  assert.deepEqual({ id: u.refusal.id, rule: u.refusal.rule, reason: u.refusal.reason, by: u.refusal.by }, { id: reading, rule: 'withdrawn', reason: expectedMsg, by: 'catalogue' }, 'the record refuses it by the withdrawn reading');
  const f = lintFile(parent).find((x) => x.rule === 'withdrawn' && x.unit === unit);
  assert.ok(f, 'the lint refuses it');
  lintMsg = `${f.rule}  ${f.msg}`;
  assert.equal(f.msg, expectedMsg);
  assert.throws(() => translate(parent, null, { core: true, heap: true, only: [unit] }), (e) => { translateMsg = String(e.message); return e.constructor.name === 'Unsupported'; }, 'the translator refuses it (an Unsupported, never a crash)');
  assert.ok(translateMsg.includes(lintMsg), `the translator names the same rule and reason as the lint: ${translateMsg}`);
} finally { restore(); }

// 3. restored: admitted again, the record made under the withdrawal is not served
assert.equal(lowerFile(parent).units.find((u) => u.unit === unit).refusal, null, 'admitted again once the withdrawal is lifted');

// 4. the command lines, withdrawn by LEAN_WITHDRAW: the lint and the translator refuse with the same line, the check proves
// nothing; without it the check proves the unit equal (the control: the withdrawal is what changed the verdict)
const env = { LEAN_WITHDRAW: `${reading}=${reason}` };
const lint = node([path.join(here, '../lint/lint.mjs'), parent], env);
assert.equal(lint.status, 1, `the lint command exits 1: ${lint.stdout}${lint.stderr}`);
assert.ok(lint.stdout.includes(lintMsg), 'the lint command names the withdrawn reading');
const tr = node([path.join(here, '../translate/translate.mjs'), parent, '--core', '--only', unit, '--heap', '--out', path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lean-withdrawal-')), 'x.dfy')], env);
assert.equal(tr.status, 1, `the translate command exits 1 (a refusal, not a crash): ${tr.stderr.slice(-300)}`);
assert.ok(tr.stderr.includes(lintMsg), 'the translate command names the same rule and reason');
const check = (e) => { const r = node([path.join(here, '../check.mjs'), '--parent', parent, '--candidate', candidate, '--unit', unit, '--n', '50'], e); assert.equal(r.status, 0, `check exits 0: ${r.stderr.slice(-300)}`); return JSON.parse(r.stdout); };
const withdrawn = check(env);
assert.notEqual(withdrawn.verdict, 'PASS-proved', 'no proof under the withdrawal');
assert.match(withdrawn.certificate.lanes.A?.verdict ?? '', /^ASK/, 'lane A asks');
assert.ok(String(withdrawn.certificate.lanes.A?.detail ?? '').includes('withdrawn'), 'lane A names the withdrawal');
const control = check({ LEAN_WITHDRAW: '' });
assert.equal(control.verdict, 'PASS-proved', 'the same unit is proved with the reading in force');

// 5. the audit: every decision site belongs to a reading
const sites = auditSites();
const missing = sites.filter((s) => !s.reading);
assert.equal(missing.length, 0, `uncatalogued sites: ${missing.map((s) => `${s.file}:${s.line}`).join(', ')}`);

console.log(`withdrawal: ${reading} v${version} refused identically by the lint, the translator and the record; check ${withdrawn.verdict} (lane A ${withdrawn.certificate.lanes.A.verdict}) under the withdrawal, ${control.verdict} without; audit ${sites.length} site rows, 0 uncatalogued`);
