#!/usr/bin/env node
// lean check: one unit, parent against candidate, both lanes, one verdict with its certificate.
//
//   node check.mjs --parent <file.ts> --candidate <file.ts> --unit <name|Class.method> [--out verdict.json]
//                  [--n 200] [--seed 1] [--project <tsconfig>|--no-project] [--dafny-seconds 60] [--scope scope.json] [--deep[=k]]
//
// Order: lane B (bounded execution) first; a WITNESS ends the question. Then lane A (proof): lint, translate both
// sides (the effect set shared), theorem, Dafny. The verdict is the strongest statement the evidence supports:
//   WITNESS       > PASS-proved > PASS-decided > PASS-bounded > ASK
//   PASS-decided: a component whose state and props are finite by its types, the product of both state spaces explored to the end.
//   NEW and REFUSE(load) are candidate-only observations, outside the equality ordering.
// A PASS-bounded never becomes a proof; a proof lemma that fails is ASK:unproved (not a refutation).
// The certificate lists what was checked: file hashes, the unit, the bound, the theorem and prelude hashes, the
// Dafny and Z3 versions, the time limit, and the lemma results, so a reader can re-run every step.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runPair, crumb, crumbText, verdictGuard, deepDepth } from './exec/run.mjs';
import { formatOp } from './patch.mjs';
import { unitTextEqual } from './exec/callees.mjs';
import { ts, loadProgram, topLevelFunctions, dn } from './common.mjs';
import { lintFile } from './lint/lint.mjs';
import { rowById, rowStatus, rowContradicted } from './decorators.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const sha = (p) => (p && fs.existsSync(p) ? createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16) : null);
const snake = (n) => n.replace('.', '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toLowerCase();
// a unit's Dafny name, the one the translator gives its function and theorem.py its lemmas: `Class.method` and camelCase
// in snake case, then common.mjs dn (a Dafny keyword takes a trailing `_`: the unit `label` has the lemma `Equal_label_`)
export const dafnyName = (unit) => dn(snake(unit));
// the parts of the canonical-heap certificate of the unit whose Dafny name is f: `EqualCanon_<f>_<part>`, a part one
// lower-case word (spec/theorem.py), so the parts of a unit `f_g` are never read as parts of a unit `f`
export const canonPartsOf = (keys, f) => keys.filter((k) => k.startsWith(`EqualCanon_${f}_`) && /^[a-z]+$/.test(k.slice(`EqualCanon_${f}_`.length)));
const run = (cmd, args, timeoutMs) => { const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: timeoutMs }); return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), timedOut: !!r.error && r.error.code === 'ETIMEDOUT' }; };

export async function check(opts) {
  const { parent, candidate, unit, n = 200, seed = 1, project = true, dafnySeconds = 60, scope = null, deep = false, adapters = null } = opts;
  // an adapter for this unit (the scope file's "adapters", the caller's, or a // lean-adapter comment on the candidate): the
  // claim is f_candidate(A(x)) == f_parent(x); lane B runs both sides on the same raw inputs, so its WITNESS does not
  // answer that claim and never ends the question
  const scopeFile = scope ? JSON.parse(fs.readFileSync(scope, 'utf8')) : null;
  const declared = { ...(() => { try { return commentAdapters(candidate); } catch { return {}; } })(), ...(adapters ?? {}), ...(scopeFile?.adapters ?? {}) };
  const adapter = declared[dafnyName(unit)] ? { name: dafnyName(unit), ...declared[dafnyName(unit)], door: declared[dafnyName(unit)].door ?? 'scope' } : null;
  const cert = { tool: 'lean-ts v3', unit, parent: { file: parent, sha256: sha(parent) }, candidate: { file: candidate, sha256: sha(candidate) }, lanes: {} };
  // ---- lane B ----
  const b = await runPair({ parent, candidate, unit, n, seed, project, deep });
  if (b.witnesses?.some((w) => w.where?.lines?.candidate)) {
    const findings = lintFile(candidate, null, { project });
    for (const w of b.witnesses) {
      const site = w.where?.lines?.candidate;
      if (!site || path.resolve(site.file) !== path.resolve(candidate)) continue;
      const finding = findings.find((f) => f.advice && f.line <= site.start && (f.endLine ?? f.line) >= site.end);
      if (finding) w.where.advice = { rule: finding.rule, label: finding.label, advice: finding.advice };
    }
  }
  crumb.phase = 'lane A'; crumb.input = null;
  cert.lanes.B = { verdict: b.verdict, reason: b.reason ?? null, bound: b.bound ?? null, witnesses: b.witnesses ? b.witnesses.map((w) => ({ input: w.input, args: w.args, where: w.where, ...(w.through ? { through: w.through } : {}) })) : null };
  try { cert.unitTextEqual = b.unitTextEqual ?? unitTextEqual(parent, candidate, unit); } catch { cert.unitTextEqual = null; } // the unit's own text, comments and whitespace dropped, equal on both sides or not: beside the file hashes, it says whether a difference came through this function's text or through what it calls
  cert.observation = b.bound?.frontEnd ? { ...b.bound.frontEnd } : { layer: 'values and the reachable object graph', renders: null, effects: 'the trace of environment requests and pending work', schedule: 'synchronous; pending work recorded, never fired' }; // every verdict names its layer (research 18, 19)
  if (b.bound?.frontEnd?.layers) { const L = b.bound.frontEnd.layers; cert.layers = { tree: { ...L.tree, proof: 'lane A reads the unit alone: a component tag is a name and useContext a world read keyed by the context, so a proof covers the unit\'s own tree of names' }, styles: L.styles, notObserved: L.notObserved }; } // a rendered unit: each layer its own result with its assumptions (design/ui-layers.md)
  if (b.verdict === 'NEW' || b.verdict === 'REFUSE' || b.candidateOnly) { cert.lanes.B = b; return finish(b.verdict, cert, b); }
  if (adapter) cert.adapter = adapter;
  // a WITNESS ends the question, except on a unit whose signature changed with no adapter: the two sides take different
  // inputs, so a raw same-input difference blames behaviour for an interface change. Lane A's translation and theorem
  // (no Dafny) say which; with an adapter lane B is not the adapted claim and lane A answers (lane B does not run the
  // candidate through A: the map is a Dafny expression, not code lane B can run)
  const witnessed = b.verdict === 'WITNESS' && !adapter;
  const witnessOut = () => finish('WITNESS', cert, { witness: b.witnesses[0] });
  if (b.bound?.library) cert.library = { records: b.bound.library.records, ops: b.bound.library.ops, outOfModel: b.bound.library.outOfModel, callbackEffects: b.bound.library.callbackEffects, defects: b.bound.library.defects.length }; // the library table validated by this run
  const bounded = b.verdict === 'PASS-decided' ? 'PASS-decided' : 'PASS-bounded'; // the rung lane B reached: decided (a finite component over every click order) outranks bounded
  const rung = () => (adapter ? 'ASK' : (b.verdict === 'PASS-bounded' || b.verdict === 'PASS-decided') ? bounded : 'ASK'); // what lane B alone supports; under an adapter it compared raw inputs, so nothing
  // ---- lane A ----
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-check-'));
  // the heap core (references, layer 2) is on: a unit over plain records and arrays is read through one heap; the core is agreed on both sides like EFFECTFUL, since a unit in the core on one side only would change its signature (agreeCore: on the units both translations hold)
  const tr = (file, suffix, eff, heapUnits) => run('node', [path.join(here, 'translate/translate.mjs'), file, '--core', '--only', unit, '--suffix', suffix, '--out', path.join(tmp, `${suffix}.dfy`), '--prelude', path.join(tmp, `${suffix}.pre.dfy`), ...(project === false ? ['--no-project'] : typeof project === 'string' ? ['--project', project] : []), '--heap', ...(eff ? ['--effectful', eff] : []), ...(heapUnits !== undefined ? ['--heap-units', heapUnits || '-'] : [])], 120000);
  const headerOf = (suffix, key) => { const p = path.join(tmp, `${suffix}.dfy`); if (!fs.existsSync(p)) return ''; const m = fs.readFileSync(p, 'utf8').match(new RegExp(`^// ${key}: (.*)$`, 'm')); return m ? m[1].trim() : ''; };
  const heapOf = (suffix) => headerOf(suffix, 'HEAP');
  const agreed = agreeCore({ files: { parent, candidate }, dfyOf: (side) => path.join(tmp, `${side}.dfy`), tr: (side, eff, units) => tr(side === 'parent' ? parent : candidate, side, eff, units) });
  if (agreed.failed) { if (witnessed) return witnessOut(); cert.lanes.A = { verdict: 'ASK', stage: `translate-${agreed.failed}`, detail: agreed.run.out.trim().slice(-600) }; return finish(rung(), cert, {}); }
  const cand = fs.readFileSync(path.join(tmp, 'candidate.dfy'), 'utf8');
  const names = [...new Set([...cand.matchAll(/\bfunction\s+([A-Za-z0-9_]+)_candidate\s*\(/g)].map((m) => m[1]))].filter((x) => !/_loop\d+$/.test(x));
  // the scope of the translated units (the unit and its same-file callees): a scope file names the file's units, and those
  // this translation holds take its entries; a unit it does not name is wholly outside S, as without a scope file
  const scopeObj = { ...(scopeFile ?? {}), functions: Object.fromEntries(names.map((x) => [x, scopeFile?.functions?.[x] ?? { in_scope: 'false' }])), summaries: true };
  const adaptersHere = Object.fromEntries(Object.entries(declared).filter(([k]) => names.includes(k)));
  if (Object.keys(adaptersHere).length) scopeObj.adapters = adaptersHere; else delete scopeObj.adapters;
  fs.writeFileSync(path.join(tmp, 'scope.json'), JSON.stringify(scopeObj)); fs.writeFileSync(path.join(tmp, 'edit.json'), '{}');
  const th = run('python3', ['-I', path.join(here, '../../spec/theorem.py'), '--parent', path.join(tmp, 'parent.dfy'), '--candidate', path.join(tmp, 'candidate.dfy'), '--scope', path.join(tmp, 'scope.json'), '--edit', path.join(tmp, 'edit.json'), '--out', path.join(tmp, 'theorem.dfy')], 60000);
  if (th.status !== 0) {
    if (witnessed) return witnessOut();
    const why = th.out.trim().slice(-400);
    const iface = /differs|does not define|opaque block calls/.test(why);
    cert.lanes.A = { verdict: iface ? 'ASK:interface' : 'ASK:theorem', detail: why };
    return finish(iface || adapter ? 'ASK' : (rung()), cert, {});
  }
  const withheldLine = (fs.readFileSync(path.join(tmp, 'theorem.dfy'), 'utf8').match(new RegExp(`^// UNGUARDED Equal_${dafnyName(unit)}: (interface differs: .*)$`, 'm')) || [])[1] ?? null;
  if (withheldLine && !adapter) { // a changed signature without an adapter: ASK:interface naming the door, whatever lane B found
    cert.lanes.A = { verdict: 'ASK:interface', identity: withheldLine, dir: tmp };
    if (b.verdict === 'WITNESS') cert.lanes.B.consulted = false; // ran and recorded; not the answer to an ill-posed comparison
    return finish('ASK', cert, { reason: `interface: ${withheldLine.replace(/^interface differs: /, '').slice(0, 600)}` });
  }
  if (witnessed) return witnessOut();
  const v = run('dafny', ['verify', '--verification-time-limit', String(dafnySeconds), path.join(tmp, 'theorem.dfy')], (dafnySeconds + 60) * 1000 * Math.max(1, names.length));
  const text = v.out;
  const m = text.match(/finished with (\d+) verified, (\d+) error/);
  const lines = fs.readFileSync(path.join(tmp, 'theorem.dfy'), 'utf8').split('\n');
  const spans = {}; let cur = null;
  lines.forEach((ln, i) => { const mm = ln.match(/^lemma (?:\{[^}]*\}\s+)*(Equal(?:Canon|Direct)?_\w+)\(/); if (mm) { cur = mm[1]; spans[cur] = [i + 1, null]; } if (/^\} \/\/ END Equal(Canon|Direct)?_/.test(ln) && cur) spans[cur][1] = i + 1; });
  const errs = [...text.matchAll(/theorem\.dfy\((\d+),\d+\): Error/g)].map((x) => Number(x[1]));
  const lemmas = Object.fromEntries(Object.entries(spans).map(([k, [a, bb]]) => [k, !errs.some((L) => a <= L && L <= bb)]));
  const main = `Equal_${dafnyName(unit)}`;
  const canonParts = canonPartsOf(Object.keys(lemmas), dafnyName(unit)); // the canonical-heap certificate: every part must hold (equal up to a renaming of fresh cells and up to dropped allocations)
  const canon = canonParts.length ? { parts: Object.fromEntries(canonParts.map((k) => [k, lemmas[k]])), proved: canonParts.every((k) => lemmas[k]) } : null;
  if (m && canon && canon.proved && !lemmas[main]) lemmas[main] = true; // the unit is proved by the canonical reading; lanes.A.reading says which
  // the callee summaries the unit's lemma rests on, each with its own result; the unit is proved only when every lemma it
  // reaches through them is proved (its own lemma's text then holds as a claim), else it is unproved through those callees
  const rests = restsOf(lines);
  const restsOn = (rests[main] ?? []).filter((k) => k !== main).map((k) => ({ callee: k.slice(6), lemma: k, verdict: lemmas[k] ? 'PASS-proved' : 'ASK:unproved' }));
  const ownLemma = lemmas[main];
  const isProved = (k) => !!m && provedLemma(k, (x) => !!lemmas[x], rests);
  for (const r of restsOn) r.verdict = isProved(r.lemma) ? 'PASS-proved' : 'ASK:unproved';
  const through = m && !isProved(main) && lemmas[main] ? restsClosure(rests, main).filter((k) => !isProved(k)).map((k) => k.slice(6)) : [];
  if (m) lemmas[main] = isProved(main) || (canon?.proved ?? false);
  const inductionLine = (lines.find((ln) => ln.startsWith(`// INDUCTION ${main}: `)) ?? '').replace(`// INDUCTION ${main}: `, '');
  const adapterLine = (lines.find((ln) => ln.startsWith(`// ADAPTER ${main}: `)) ?? '').replace(`// ADAPTER ${main}: `, '');
  const unguarded = (fs.readFileSync(path.join(tmp, 'theorem.dfy'), 'utf8').match(new RegExp(`^// UNGUARDED ${main}: (.*)$`, 'm')) || [])[1] ?? null; // the identity guard withheld the lemma: the value reading could not be shown to be a graph reading
  cert.lanes.A = { verdict: unguarded ? (unguarded.startsWith('interface') ? 'ASK:interface' : 'ASK:identity') : m ? (lemmas[main] ? 'PASS-proved' : 'ASK:unproved') : (v.timedOut ? 'ASK:timeout' : 'ASK:translation-defect'), identity: unguarded, lemmas, reading: m && lemmas[main] ? (canon && canon.proved && !(spans[main] && !errs.some((L) => spans[main][0] <= L && L <= spans[main][1])) ? 'canonical heap: equal up to a renaming of fresh cells and up to dropped allocations' : 'whole heap') : null, canonical: canon, heapCore: heapOf('candidate').split(',').filter(Boolean), dafny: (text.match(/Dafny program verifier finished[^\n]*/) || [''])[0], theoremSha256: sha(path.join(tmp, 'theorem.dfy')), preludeSha256: sha(path.join(tmp, 'candidate.pre.dfy')), dafnyVersion: run('dafny', ['--version'], 20000).out.trim(), timeLimitSeconds: dafnySeconds, dir: tmp, restsOn, ...(through.length ? { ownLemma, unprovedThrough: through } : {}), ...(inductionLine ? { induction: { measure: (inductionLine.match(/^decreases (\S+)/) ?? [])[1] ?? null, component: ((inductionLine.match(/ over ([\w,]+);/) ?? [])[1] ?? '').split(',').filter(Boolean), termination: inductionLine.replace(/^.*?; termination: /, '') } } : {}), ...(adapterLine ? { adapter: { ...adapter, theorem: adapterLine } } : {}) };
  const cellsLine = cand.match(new RegExp(`^// CELLS ${dafnyName(unit)}_candidate: (.*)$`, 'm')); // the state-completeness audit: every persistent cell the unit touches, each matched to its transition
  if (cellsLine) { try { cert.lanes.A.cells = JSON.parse(cellsLine[1]); } catch { cert.lanes.A.cells = null; } }
  if (cert.lanes.A.cells && cert.lanes.A.cells.obligations.length && m && lemmas[main] && !unguarded) { cert.lanes.A.verdict = 'ASK:obligation'; return finish('ASK', cert, { reason: `obligation: ${cert.lanes.A.cells.obligations.join('; ')}` }); } // a cell the unit touches without a transition: the lemma proves nothing about it
  const lib = b.bound?.library; // lane B's record of the unit's built-in calls against the library table: a defect is a wrong row, and the proof read that row
  if (lib && lib.defects.length) { cert.lanes.A.libraryDefects = lib.defects; if (m && lemmas[main] && !unguarded) { cert.lanes.A.verdict = 'ASK:library-model'; return finish('ASK', cert, { reason: `library-model: the engine contradicts the table on ${lib.defects.map((x) => `${x.op} (${x.why}; expected ${x.expected})`).join('; ')}; the proof lane refuses the operation until the row is corrected` }); } }
  const decoUsed = [...new Set(['parent', 'candidate'].flatMap((x) => { const p = path.join(tmp, `${x}.dfy`); return fs.existsSync(p) ? [...fs.readFileSync(p, 'utf8').matchAll(/^\/\/ DECORATORS \S+: (.*)$/gm)].flatMap((mm) => mm[1].split(',')) : []; }))].sort(); // the decorator-table rows the readings used (translate/decorators.json): each is trusted for its framework version only
  if (decoUsed.length) cert.lanes.A.decorators = decoUsed.map((id) => ({ id, version: rowById(id)?.version ?? null, fixture: rowStatus(id) }));
  const decoDefects = decoUsed.filter(rowContradicted); // a row the real framework contradicts (its fixture disagrees) is a defect of the table, and the proof read that row
  if (decoDefects.length && m && lemmas[main] && !unguarded) { cert.lanes.A.verdict = 'ASK:decorator-model'; return finish('ASK', cert, { reason: `decorator-model: the framework contradicts the decorator table on ${decoDefects.join('; ')}; the proof lane withholds the reading until the row is corrected` }); }
  const hd = b.bound?.frontEnd?.handlers; // lane B's interpreter applied each readable handler descriptor at every fire: a defect is a descriptor the engine contradicts, and the proof read that descriptor
  if (hd && typeof hd === 'object' && hd.defects?.length) { cert.lanes.A.handlerDefects = hd.defects; if (m && lemmas[main] && !unguarded) { cert.lanes.A.verdict = 'ASK:handler-model'; return finish('ASK', cert, { reason: `handler-model: the engine contradicts the descriptor on ${[...new Set(hd.defects.map((x) => x.handler))].join('; ')}; the proof lane refuses the reading until it is corrected` }); } }
  if (unguarded && unguarded.startsWith('interface')) return finish('ASK', cert, { reason: `interface: ${unguarded.replace(/^interface differs: /, '').slice(0, 600)}` }); // a changed decorator, a changed type: never a proof, and the bounded run drew its inputs from one side's types
  if (m && lemmas[main] && !unguarded) return finish('PASS-proved', cert, adapter ? { reason: `proved through the declared adapter: ${adapterLine}` } : {});
  if (m && through.length && !unguarded) return finish(rung(), cert, { reason: `unproved through ${through.join(', ')}` }); // its own lemma holds given summaries that are not proved
  return finish(rung(), cert, {});
}
function finish(verdict, cert, extra) { return { verdict, ...extra, certificate: cert }; }

// the summaries a lemma rests on (`// RESTS Equal_f: Equal_g,Equal_h`, written by spec/theorem.py): a caller's lemma uses
// each callee's lemma at the call sites, so it is proved only when every lemma it reaches this way is proved
export function restsOf(lines) { return Object.fromEntries(lines.map((ln) => ln.match(/^\/\/ RESTS (Equal_\w+): (.*)$/)).filter(Boolean).map((m) => [m[1], m[2].split(',').filter(Boolean)])); }
// whether Equal_<f> is proved: its EqualDirect_<f> (the bodies alone) holds, or its own lemma holds and so does every lemma
// it rests on, each proved the same way (a lemma on its own recursive cycle is the induction premise Dafny checked)
export function provedLemma(k, clean, rests) {
  const direct = (x) => clean(x.replace(/^Equal_/, 'EqualDirect_'));
  if (direct(k)) return true;
  const seen = new Set([k]), todo = [k];
  while (todo.length) { const x = todo.pop(); if (!clean(x)) return false; for (const g of rests[x] ?? []) if (!seen.has(g) && !direct(g)) { seen.add(g); todo.push(g); } }
  return true;
}
export function restsClosure(rests, start) { const seen = new Set(), todo = [start]; while (todo.length) for (const g of rests[todo.pop()] ?? []) if (!seen.has(g)) { seen.add(g); todo.push(g); } seen.delete(start); return [...seen]; }

// the heap core agreed between the two sides (references, layer 2). Whether a unit is in the core changes its Dafny
// signature, so a unit BOTH translations hold is in the core on both sides or on neither: the theorem compares exactly
// those units. A unit one side holds alone (a callee the candidate inlined away, a helper only one version calls) has
// no counterpart and no lemma; inside its own side the core is closed under calls (heap.mjs plan: a core unit calls core
// units only), so it takes the core when its own side puts it there, and its callers read its body as written. The
// shared units' core is the intersection of the two sides' cores, narrowed until both translations agree on it: each
// narrowing removes a unit, so the rounds end. EFFECTFUL keeps its own agreement (the candidate takes the parent's list,
// the parent then the candidate's). tr(side, eff, units|undefined) translates one side ('parent' | 'candidate') to
// dfyOf(side); with heap false no --heap-units is passed. Returns { failed, run } when a translation fails, else the
// two sides read: { parent: {eff, heap, held}, candidate: {...}, agreed: bool }.
export function agreeCore({ files, dfyOf, tr, heap = true }) {
  const fileUnits = (f) => { try { return [...topLevelFunctions(loadProgram(f, { project: false }).sf).keys()]; } catch { return []; } };
  const units = { parent: fileUnits(files.parent), candidate: fileUnits(files.candidate) };
  const read = (side) => {
    const text = fs.existsSync(dfyOf(side)) ? fs.readFileSync(dfyOf(side), 'utf8') : '';
    const hdr = (key) => (text.match(new RegExp(`^// ${key}: (.*)$`, 'm')) ?? [])[1]?.trim() ?? '';
    const defined = new Set([...text.matchAll(/^\/\/ CELLS ([A-Za-z0-9_]+): /gm)].map((m) => m[1])); // every unit the translation emitted has its CELLS line (written once the unit is read)
    return { eff: hdr('EFFECTFUL'), heap: hdr('HEAP').split(',').filter(Boolean), held: new Set(units[side].filter((u) => defined.has(`${dafnyName(u)}_${side}`))) }; // the unit's Dafny name as the translator writes it (dafnyName: a Dafny keyword takes a trailing underscore)
  };
  const list = (xs) => (heap ? [...new Set(xs)].sort().join(',') : undefined);
  const p1 = tr('parent', '', undefined);
  if (p1.status !== 0) return { failed: 'parent', run: p1 };
  let P = read('parent');
  // the candidate may put in its core what the parent put there, and any unit the parent's translation does not hold
  const c1 = tr('candidate', P.eff, list([...P.heap, ...units.candidate.filter((u) => !P.held.has(u))]));
  if (c1.status !== 0) return { failed: 'candidate', run: c1 };
  let C = read('candidate');
  const agree = () => { const shared = (u) => P.held.has(u) && C.held.has(u); const a = P.heap.filter(shared).sort(), b = C.heap.filter(shared).sort(); return { same: a.join(',') === b.join(','), both: a.filter((u) => b.includes(u)), shared }; };
  const narrowed = (X, both, shared) => list([...both, ...X.heap.filter((u) => !shared(u))]);
  let g = agree();
  if (C.eff !== P.eff || (heap && !g.same)) {
    const r = tr('parent', C.eff, narrowed(P, g.both, g.shared)); if (r.status !== 0) return { failed: 'parent', run: r };
    P = read('parent');
    for (let rounds = P.held.size + 1; heap && rounds > 0 && !(g = agree()).same; rounds--) { // a shared unit the narrowed side dropped: narrow the other side, and so on
      const side = C.heap.filter(g.shared).length > g.both.length ? 'candidate' : 'parent';
      const r2 = tr(side, side === 'parent' ? C.eff : P.eff, narrowed(side === 'parent' ? P : C, g.both, g.shared)); if (r2.status !== 0) return { failed: side, run: r2 };
      if (side === 'parent') P = read('parent'); else C = read('candidate');
    }
  }
  return { parent: P, candidate: C, agreed: !heap || agree().same };
}

// the comment door of an adapter: `// lean-adapter {"from": [...], "to": [...], "map": [...]}` in the comments just above a
// candidate function (a top-level function, an arrow const, a class method). Keys are the Dafny names the theorem uses.
export function commentAdapters(file) {
  const out = {};
  let sf; try { ({ sf } = loadProgram(file, { project: false })); } catch { return out; }
  const text = sf.getFullText();
  for (const u of topLevelFunctions(sf).values()) {
    let node = u.node; while (node.parent && !ts.isSourceFile(node.parent) && !ts.isClassLike(node.parent) && !ts.isVariableStatement(node)) node = node.parent; // an arrow const carries its comments on its statement
    for (const r of ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []) {
      const m = text.slice(r.pos, r.end).match(/^\/\/\s*lean-adapter\s+(\{.*\})\s*$/);
      if (!m) continue;
      try { out[dafnyName(u.name)] = { ...JSON.parse(m[1]), door: 'comment' }; } catch { out[dafnyName(u.name)] = { door: 'comment', from: null, to: null, map: null }; } // a comment that is not JSON: the theorem refuses it by name
    }
  }
  return out;
}
// a run that ends without a verdict, or a harness error that escapes a lane: ASK:harness, the phase named
const harnessAsk = (reason, opts) => finish('ASK', { tool: 'lean-ts v3', unit: opts.unit, parent: { file: opts.parent, sha256: sha(opts.parent) }, candidate: { file: opts.candidate, sha256: sha(opts.candidate) }, lanes: { B: { verdict: 'ASK:harness', reason } } }, { reason });

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const files = { parent: opt('--parent'), candidate: opt('--candidate'), unit: opt('--unit') };
  const guard = verdictGuard(opt('--out', null), (r) => harnessAsk(r.reason, files));
  const res = await check({ parent: opt('--parent'), candidate: opt('--candidate'), unit: opt('--unit'), n: Number(opt('--n', 200)), seed: Number(opt('--seed', 1)), project: a.includes('--no-project') ? false : opt('--project', true), dafnySeconds: Number(opt('--dafny-seconds', 60)), scope: opt('--scope', null), deep: deepDepth((a.find((x) => x === '--deep' || x.startsWith('--deep=')) ?? '--deep=0') === '--deep' ? 1 : (a.find((x) => x.startsWith('--deep=')) ?? '--deep=0').slice(7)) }).catch((e) => harnessAsk(`harness: ${crumbText()}: ${String(e && e.message || e).slice(0, 300)}`, files));
  guard.settle();
  const out = opt('--out', null);
  const text = JSON.stringify(res, null, 1);
  if (out) { fs.writeFileSync(out, text); console.log(`${res.verdict} -> ${out}`); } else console.log(text);
  if (out && res.verdict === 'WITNESS' && Array.isArray(res.witness?.patch)) { console.log(`patch: ${res.witness.patchSummary}`); for (const op of res.witness.patch) console.log(`  ${formatOp(op)}`); } // a front-end WITNESS: the patch from the parent's tree to the candidate's, one op per line, path first (the JSON form carries it in witness.patch)
}
