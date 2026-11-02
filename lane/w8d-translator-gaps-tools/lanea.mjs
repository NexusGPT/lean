// w8d: lane A alone on one unit, parent against candidate, with the tree given: the steps check.mjs takes after lane B
// (agreeCore, theorem.py, Dafny under dafnyVerifyArgs, provedLemma over the rests, the canonical parts, the identity
// guard, numberDecision), without the cheap rungs (which decide a self-pair before Dafny runs, so they say nothing of
// the translator). Prints one JSON line.
//   node lanea.mjs <tree langs/ts> <parent> <candidate> <unit> <workdir>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const [T, parent, candidate, unit, dir] = process.argv.slice(2);
const { agreeCore, provedLemma, restsOf, canonPartsOf, numberDecision, dafnyName, faithfulPlacement } = await import(`${T}/check.mjs`);
const { dafnyVerifyArgs } = await import(`${T}/exec/dafny-args.mjs`);
const { formatUnitList } = await import(`${T}/common.mjs`);
fs.mkdirSync(dir, { recursive: true });
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26, timeout: 300000, env: { ...process.env, LEAN_WORKER_HEAP_MB: '6144' } }); return { status: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }; };
const tr = (file, suffix, eff, heapUnits) => run('node', [path.join(T, 'translate/translate.mjs'), file, '--core', '--only', formatUnitList([unit]), '--suffix', suffix, '--out', path.join(dir, `${suffix}.dfy`), '--prelude', path.join(dir, `${suffix}.pre.dfy`), '--heap', ...(eff ? ['--effectful', eff] : []), ...(heapUnits !== undefined ? ['--heap-units', heapUnits || '-'] : [])]);
const out = (o) => { console.log(JSON.stringify({ unit, ...o })); process.exit(0); };
const agreed = agreeCore({ files: { parent, candidate }, dfyOf: (s) => path.join(dir, `${s}.dfy`), tr: (s, eff, units) => tr(s === 'parent' ? parent : candidate, s, eff, units) });
if (agreed.failed) out({ verdict: 'ASK', stage: `translate-${agreed.failed}`, detail: agreed.run.out.trim().slice(-300) });
const cand = fs.readFileSync(path.join(dir, 'candidate.dfy'), 'utf8');
const names = [...new Set([...cand.matchAll(/\bfunction\s+([A-Za-z0-9_]+)_candidate\s*\(/g)].map((m) => m[1]))].filter((x) => !/_loop\d+$/.test(x));
fs.writeFileSync(path.join(dir, 'scope.json'), JSON.stringify({ functions: Object.fromEntries(names.map((x) => [x, { in_scope: 'false' }])), summaries: true }));
fs.writeFileSync(path.join(dir, 'edit.json'), '{}');
const th = run('python3', ['-I', path.join(T, '../../spec/theorem.py'), '--parent', path.join(dir, 'parent.dfy'), '--candidate', path.join(dir, 'candidate.dfy'), '--scope', path.join(dir, 'scope.json'), '--edit', path.join(dir, 'edit.json'), '--out', path.join(dir, 'theorem.dfy')]);
if (th.status !== 0) out({ verdict: 'ASK:theorem', detail: th.out.trim().slice(-300) });
const thText = fs.readFileSync(path.join(dir, 'theorem.dfy'), 'utf8'), lines = thText.split('\n');
const main = `Equal_${dafnyName(unit)}`;
const unguarded = (thText.match(new RegExp(`^// UNGUARDED ${main}: (.*)$`, 'm')) || [])[1] ?? null;
const v = run('dafny', ['verify', ...dafnyVerifyArgs(), path.join(dir, 'theorem.dfy')]);
const m = v.out.match(/finished with (\d+) verified, (\d+) error/);
const spans = {}; let cur = null;
lines.forEach((ln, i) => { const mm = ln.match(/^lemma (?:\{[^}]*\}\s+)*(Equal(?:Canon|Direct)?_\w+)\(/); if (mm) { cur = mm[1]; spans[cur] = [i + 1, null]; } if (/^\} \/\/ END Equal(Canon|Direct)?_/.test(ln) && cur) spans[cur][1] = i + 1; });
const errs = [...v.out.matchAll(/theorem\.dfy\((\d+),\d+\): Error/g)].map((x) => Number(x[1]));
const lemmas = Object.fromEntries(Object.entries(spans).map(([k, [a, b]]) => [k, !errs.some((L) => a <= L && L <= b)]));
const parts = canonPartsOf(Object.keys(lemmas), dafnyName(unit));
const canon = parts.length > 0 && parts.every((k) => lemmas[k]);
const rests = restsOf(lines);
const lemmaProved = !!m && !unguarded && (provedLemma(main, (x) => !!lemmas[x], rests) || canon);
const firstErr = (v.out.match(/theorem\.dfy\(\d+,\d+\): Error: [^\n]*/) ?? [''])[0].replace(/^.*?Error: /, '').slice(0, 160);
const nd = await numberDecision({ parent, candidate, unit, project: true, dir, lemmaProved });
out({ verdict: nd.proved ? 'PASS-proved' : unguarded ? 'ASK:identity' : !m ? 'ASK:translation-defect' : 'ASK:unproved', lemma: lemmaProved, finished: !!m, reading: nd.reading, reasons: nd.reasons ?? null, faithful: faithfulPlacement(dir, dafnyName(unit)), error: m ? null : firstErr || v.out.trim().slice(-160) });
