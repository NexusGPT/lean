// A5 for lane w1g (design/w1g-opaque-handed.md): the units read-after-call, copied-argument or type-assertion stopped
// at the base that enter after, each one's opaque fraction (its `// OPAQUE <unit>` line) and the share of its text the
// opaque spans cover; and the per-rule table.
//   node a5.mjs <lean-ts-dir> <root-dir> <base.json> <after.json> [--out a5.json]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
const [leanTs, rootDir, baseF, afterF] = process.argv.slice(2);
const outF = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;
const RULES = new Set(['read-after-call', 'copied-argument', 'type-assertion']);
const lines = new Map();
const state = (j) => {
  const m = new Map();
  for (const rec of j.records ?? []) for (const u of rec.units ?? []) {
    const fs_ = (rec.findings ?? []).filter((f) => u.lines[0] <= f.line && f.line <= u.lines[1]);
    const env = fs_.find((f) => f.env), lang = fs_.find((f) => !f.env);
    m.set(`${rec.file}\u0000${u.name}`, env ? 'environment' : lang ? lang.rule : 'entered'); lines.set(`${rec.file}\u0000${u.name}`, u.lines);
  }
  return m;
};
const base = state(JSON.parse(fs.readFileSync(baseF, 'utf8'))), after = state(JSON.parse(fs.readFileSync(afterF, 'utf8')));
const table = {};
const newly = [];
for (const [k, b] of base) {
  if (!RULES.has(b)) continue;
  const a = after.get(k) ?? 'missing';
  const row = (table[b] ??= { base: 0, entered: 0, stillSame: 0, otherRule: 0, otherRules: {} });
  row.base++;
  if (a === 'entered') { row.entered++; newly.push({ key: k, rule: b }); }
  else if (a === b) row.stillSame++;
  else { row.otherRule++; row.otherRules[a] = (row.otherRules[a] ?? 0) + 1; }
}
// after: units stopped by the three rules (the validator's number), whatever they were before
const afterStopped = {}; for (const [, a] of after) if (RULES.has(a)) afterStopped[a] = (afterStopped[a] ?? 0) + 1;
const baseStopped = {}; for (const [, b] of base) if (RULES.has(b)) baseStopped[b] = (baseStopped[b] ?? 0) + 1;
// opaque fractions, one translation per file
const snake = (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toLowerCase();
const { dn } = await import(path.join(leanTs, 'common.mjs'));
const tsconfigOf = (f) => { for (let d = path.dirname(f); d.startsWith(rootDir); d = path.dirname(d)) { const t = path.join(d, 'tsconfig.json'); if (fs.existsSync(t)) return t; if (d === rootDir) break; } return null; };
const byFile = new Map(); for (const n of newly) { const [file, unit] = n.key.split('\u0000'); if (!byFile.has(file)) byFile.set(file, []); byFile.get(file).push({ ...n, unit, lines: lines.get(n.key) }); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w1g-a5-'));
const fractions = []; let translated = 0, failed = 0;
const { spawn } = await import('node:child_process');
const one = (file, us, i) => new Promise((resolve) => {
  const abs = path.join(rootDir, file), tc = tsconfigOf(abs), out = path.join(tmp, `o${i}.dfy`);
  const c = spawn('node', [path.join(leanTs, 'translate/translate.mjs'), abs, '--core', '--heap', '--tolerant', ...(tc ? ['--project', tc] : ['--no-project']), '--out', out, '--prelude', path.join(tmp, `o${i}.pre.dfy`)], { stdio: ['ignore', 'ignore', 'ignore'] });
  const timer = setTimeout(() => c.kill('SIGKILL'), 300000);
  c.on('close', (code) => {
    clearTimeout(timer);
    let text = ''; try { text = fs.readFileSync(out, 'utf8'); } catch { /* none */ }
    if (code !== 0 || !text) failed++; else translated++;
    const steps = new Map([...text.matchAll(/^\/\/ OPAQUE (\S+): (.*)$/gm)].map((m) => [m[1], JSON.parse(m[2])]));
    let src = ''; try { src = fs.readFileSync(abs, 'utf8'); } catch { /* none */ }
    const starts = [0]; for (let i = 0; i < src.length; i++) if (src[i] === '\n') starts.push(i + 1);
    const off = (l, c) => (starts[l - 1] ?? src.length) + c - 1;
    for (const u of us) {
      const e = steps.get(dn(snake(u.unit.replace('.', '_'))));
      const [ua, ub] = u.lines; const lo = starts[ua - 1] ?? 0, hi = (starts[ub] ?? src.length + 1) - 1;
      // the share of the unit's text the opaque spans cover (their union); a step with no span counts its statements' share
      const iv = (e?.steps ?? []).filter((s) => Array.isArray(s.span)).map((s) => [Math.max(lo, off(s.span[0], s.span[1])), Math.min(hi, off(s.span[2], s.span[3]))]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
      let covered = 0, end = -1; for (const [a, b] of iv) { if (a > end) { covered += b - a; end = b; } else if (b > end) { covered += b - end; end = b; } }
      const spanless = (e?.steps ?? []).some((s) => !Array.isArray(s.span));
      const textShare = hi > lo ? Math.max(covered / (hi - lo), spanless ? e.fraction : 0) : 0;
      fractions.push({ file, unit: u.unit, rule: u.rule, translated: !!text, fraction: e ? e.fraction : 0, textShare: Math.round(1000 * textShare) / 1000, steps: e ? e.steps.map((s) => s.rule) : [], spans: e ? e.steps.map((s) => s.span) : [] });
    }
    resolve();
  });
});
const work = [...byFile.entries()]; let next = 0;
await Promise.all([0, 1, 2].map(async () => { while (next < work.length) { const i = next++; await one(work[i][0], work[i][1], i); } }));
fs.rmSync(tmp, { recursive: true, force: true });
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const perRule = {}; for (const f of fractions) (perRule[f.rule] ??= []).push(f.fraction);
const perRuleText = {}; for (const f of fractions) (perRuleText[f.rule] ??= []).push(f.textShare);
const out = { baseStopped, afterStopped, table, newlyEntered: newly.length, translated, failed, median: median(fractions.map((f) => f.fraction)), medianTextShare: median(fractions.map((f) => f.textShare)), perRuleMedian: Object.fromEntries(Object.entries(perRule).map(([k, v]) => [k, { n: v.length, median: median(v), medianTextShare: median(perRuleText[k]), withSteps: fractions.filter((f) => f.rule === k && f.steps.length).length }])), fractions };
if (outF) fs.writeFileSync(outF, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, fractions: undefined }, null, 1));
