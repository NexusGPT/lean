// node lane/w1a-opaque-mutation-compare.mjs <root dir> <before.json> <after.json> <tree/langs/ts> [--fractions <out.json>]
// Per rule of the mutation family: the units the census stopped under it before and after (refusalRules, the first
// rule per unit), the entered counts, the units newly entered, and for those the opaque fraction (the translator's
// `// OPAQUE` line of each unit, translate --core --tolerant over its file inside the root's project).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const [root, beforeF, afterF, ts] = process.argv.slice(2);
const fracOut = process.argv.includes('--fractions') ? process.argv[process.argv.indexOf('--fractions') + 1] : null;
const FAMILY = ['alias-mutation', 'param-assign', 'param-mutation', 'property-assign', 'index-assign', 'in-place-mutation', 'closure-mutation', 'opaque-mutation', 'receiver-mutation', 'receiver-write', 'object-method-capture', 'object-method-mutation', 'mutator-value'];
const read = (f) => { const j = JSON.parse(fs.readFileSync(f, 'utf8')); if (!j.records?.length && fs.existsSync(f + '.records.jsonl')) { j.records = []; for (const l of fs.readFileSync(f + '.records.jsonl', 'utf8').split('\n')) { if (!l.trim()) continue; try { const x = JSON.parse(l); if (x.records) j.records.push(...x.records); } catch { /* a partial line */ } } } return j; };
const B = read(beforeF), A = read(afterF);
const stops = (c) => Object.fromEntries((c.refusalRules ?? []).map((r) => [r.rule, r.units]));
const sb = stops(B), sa = stops(A);
// the stopping rule of each unit: the first non-environment finding of the unit, as the census counts it
const firstStop = (c) => { const m = new Map(); for (const r of c.records ?? []) { for (const f of r.findings ?? []) if (f.unit && !f.env && !m.has(`${r.file}#${f.unit}`)) m.set(`${r.file}#${f.unit}`, f.rule); } return m; };
const fb = firstStop(B), fa = firstStop(A);
const newly = [...fb].filter(([k, rule]) => FAMILY.includes(rule) && !fa.has(k)).map(([k, rule]) => ({ file: k.split('#')[0], unit: k.slice(k.indexOf('#') + 1), rule }));
const movedOn = [...fb].filter(([k, rule]) => FAMILY.includes(rule) && fa.has(k)).map(([k, rule]) => ({ key: k, before: rule, after: fa.get(k) }));
const out = { root, before: { units: B.units, entered: B.entered, partial: !!B.partial }, after: { units: A.units, entered: A.entered, partial: !!A.partial }, rules: {}, newlyEntered: newly.length, stoppedByAnotherRuleNow: movedOn.length };
for (const r of FAMILY) out.rules[r] = { before: sb[r] ?? 0, after: sa[r] ?? 0, newlyEntered: newly.filter((x) => x.rule === r).length, nowStoppedBy: Object.entries(movedOn.filter((x) => x.before === r).reduce((m, x) => ((m[x.after] = (m[x.after] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 4) };
out.familyStopsBefore = FAMILY.reduce((n, r) => n + (sb[r] ?? 0), 0);
out.familyStopsAfter = FAMILY.reduce((n, r) => n + (sa[r] ?? 0), 0);
out.enteredDelta = (A.entered ?? 0) - (B.entered ?? 0);
if (fracOut) {
  const { dafnyName } = await import(path.join(ts, 'check.mjs'));
  const byFile = new Map(); for (const x of newly) { if (!byFile.has(x.file)) byFile.set(x.file, []); byFile.get(x.file).push(x); }
  const fr = []; const tmp = fs.mkdtempSync('/tmp/w1a-frac-');
  for (const [file, us0] of byFile) for (const u0 of us0) { const us = [u0]; // one unit per run: a unit name may hold a comma (--only splits on it)
    const o = path.join(tmp, 'x.dfy');
    const r = spawnSync('node', [path.join(ts, 'translate/translate.mjs'), path.join(root, file), '--core', '--tolerant', '--suffix', 'z', '--only', us.map((u) => u.unit).join(','), '--out', o, '--prelude', path.join(tmp, 'x.pre.dfy')], { encoding: 'utf8', cwd: root, timeout: 300000 });
    let text = ''; try { text = fs.readFileSync(o, 'utf8'); } catch { /* none */ }
    for (const u of us) {
      const m = text.match(new RegExp(`^// OPAQUE ${dafnyName(u.unit)}_z: (.*)$`, 'm'));
      let e = null; try { e = m ? JSON.parse(m[1]) : null; } catch { /* none */ }
      fr.push({ ...u, fraction: e ? e.fraction : null, statements: e?.statements ?? null, covered: e?.covered ?? null, spanEqualsFinding: e ? e.steps.every((s) => s.findings.length === 1 && JSON.stringify(s.findings[0]) === JSON.stringify(s.span)) : null, translated: !!text, why: m ? null : (r.stderr || r.stdout || '').trim().split('\n').pop()?.slice(0, 160) });
    }
    try { fs.rmSync(o); } catch { /* none */ }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  const fs_ = fr.filter((x) => x.fraction !== null).map((x) => x.fraction).sort((a, b) => a - b);
  const med = (xs) => (xs.length ? (xs.length % 2 ? xs[(xs.length - 1) / 2] : (xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2) : null);
  out.fraction = { measured: fs_.length, of: fr.length, median: med(fs_), p25: fs_.length ? fs_[Math.floor(fs_.length / 4)] : null, p75: fs_.length ? fs_[Math.floor((3 * fs_.length) / 4)] : null, whole: fs_.filter((x) => x === 1).length, atMostQuarter: fs_.filter((x) => x <= 0.25).length, spanEqualsFinding: fr.filter((x) => x.spanEqualsFinding).length, perRule: Object.fromEntries(FAMILY.map((r) => { const xs = fr.filter((x) => x.rule === r && x.fraction !== null).map((x) => x.fraction).sort((a, b) => a - b); return [r, { n: xs.length, median: med(xs) }]; }).filter(([, v]) => v.n)) };
  fs.writeFileSync(fracOut, JSON.stringify(fr, null, 1));
}
console.log(JSON.stringify(out, null, 1));
