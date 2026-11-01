// Lane B's branch-guided input search (design/w3c-search-inputs.md): after the ordinary draws agree, a seeded local
// search over the typed input space for an input on which the two sides differ. It starts from the drawn inputs and
// changes one leaf at a time: a number to the literals the unit's text holds, to the boundaries of the safe integers
// (on and just off each), and by one; a string to the unit's string literals and their neighbours; a literal-typed leaf
// to every member; a boolean flipped; an optional to absent; a list by one element more or less. An input is kept when
// lane B reaches a branch of the changed lines it had not reached (the branches: the unit's conditions whose arm, or
// whose own text, holds a line the diff changed; reached: the branch probes compiled into the two files, branchMarks).
// A changed input is a recipe (the draw it starts from and the leaf changes in order), so both sides start from the same
// value and a replay rebuilds it. The search stops when every target branch is reached, when no kept input has a change
// left, or at its bounds (inputs tried, wall time). A divergence counts only after a second run on fresh environments
// gives the same two observations.
import path from 'node:path';
import { ts, topLevelFunctions } from '../common.mjs';
import { makeRng } from './fake.mjs';
import { fits } from './spec.mjs';

// ----- the branches: every condition of a file, with the lines each outcome governs -----
// mode 'truthy': the outcome is the value's truthiness; 'nullish': whether the left of `??` is null or undefined (the
// right runs on T); 'enter': a switch clause entered (one outcome). The key is the original node's pos, end and kind,
// which the transformer meets through ts.getOriginalNode whatever the transforms before it rebuilt
const exits = (st) => !!st && (ts.isReturnStatement(st) || ts.isThrowStatement(st) || ts.isBreakStatement(st) || ts.isContinueStatement(st) || (ts.isBlock(st) && exits(st.statements.at(-1))));
export function branchTable(sf) {
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const span = (n) => (n ? [lineOf(n.getStart(sf)), lineOf(n.end)] : null);
  const out = [];
  const add = (holder, cond, mode, arms) => out.push({ k: out.length, key: `${holder.pos}:${holder.end}:${holder.kind}`, mode, start: holder.getStart(sf), end: holder.end, cs: (cond ?? holder).pos, ce: (cond ?? holder).end, cond: cond ? span(cond) : span(holder), arms, text: (cond ?? holder).getText(sf).slice(0, 80) });
  const visit = (n) => {
    if (ts.isIfStatement(n)) {
      let F = n.elseStatement ? [span(n.elseStatement)] : [];
      if (!n.elseStatement && exits(n.thenStatement) && n.parent && (ts.isBlock(n.parent) || ts.isSourceFile(n.parent) || ts.isCaseClause(n.parent) || ts.isDefaultClause(n.parent))) { // control dependence: the statements after an if whose then-arm always leaves run only on F
        const sts = n.parent.statements, at = sts.indexOf(n);
        F = sts.slice(at + 1).map(span);
      }
      add(n, n.expression, 'truthy', { T: [span(n.thenStatement)], F });
    } else if (ts.isConditionalExpression(n)) add(n, n.condition, 'truthy', { T: [span(n.whenTrue)], F: [span(n.whenFalse)] });
    else if (ts.isWhileStatement(n) || ts.isDoStatement(n)) add(n, n.expression, 'truthy', { T: [span(n.statement)], F: [] });
    else if (ts.isForStatement(n) && n.condition) add(n, n.condition, 'truthy', { T: [span(n.statement)], F: [] });
    else if (ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(n.operatorToken.kind)) {
      const op = n.operatorToken.kind;
      add(n, n.left, op === ts.SyntaxKind.QuestionQuestionToken ? 'nullish' : 'truthy', op === ts.SyntaxKind.BarBarToken ? { T: [], F: [span(n.right)] } : { T: [span(n.right)], F: [] });
    } else if (ts.isCaseClause(n) || ts.isDefaultClause(n)) add(n, ts.isCaseClause(n) ? n.expression : null, 'enter', { T: n.statements.map(span) });
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

// the probes: `state.b(file, k, value)` around each condition (the value comes back unchanged), a `state.b(file, k, true)`
// statement first in each switch clause. A probe adds no function, so the loader's function-text keys are untouched.
// It runs after every other transform of the loader (their statement marks read original positions)
export function branchMarks(table, abs, stateName) {
  const byKey = new Map(table.map((e) => [e.key, e]));
  return (context) => {
    const f = context.factory;
    const probe = (k, e) => f.createCallExpression(f.createPropertyAccessExpression(f.createIdentifier(stateName), 'b'), undefined, [f.createStringLiteral(abs), f.createNumericLiteral(k), e]);
    const visit = (node) => {
      const n = ts.visitEachChild(node, visit, context);
      const o = ts.getOriginalNode(node);
      const e = byKey.get(`${o.pos}:${o.end}:${o.kind}`);
      if (!e || n.kind !== o.kind) return n;
      if (ts.isIfStatement(n)) return f.updateIfStatement(n, probe(e.k, n.expression), n.thenStatement, n.elseStatement);
      if (ts.isConditionalExpression(n)) return f.updateConditionalExpression(n, probe(e.k, n.condition), n.questionToken, n.whenTrue, n.colonToken, n.whenFalse);
      if (ts.isWhileStatement(n)) return f.updateWhileStatement(n, probe(e.k, n.expression), n.statement);
      if (ts.isDoStatement(n)) return f.updateDoStatement(n, n.statement, probe(e.k, n.expression));
      if (ts.isForStatement(n) && n.condition) return f.updateForStatement(n, n.initializer, probe(e.k, n.condition), n.incrementor, n.statement);
      if (ts.isBinaryExpression(n)) return f.updateBinaryExpression(n, probe(e.k, n.left), n.operatorToken, n.right);
      if (ts.isCaseClause(n)) return f.updateCaseClause(n, n.expression, [f.createExpressionStatement(probe(e.k, f.createTrue())), ...n.statements]);
      if (ts.isDefaultClause(n)) return f.updateDefaultClause(n, [f.createExpressionStatement(probe(e.k, f.createTrue())), ...n.statements]);
      return n;
    };
    return (sf) => ts.visitNode(sf, visit);
  };
}
// the outcome a probe records: a nullish probe's T is `v == null`, a clause's is its entry, every other one truthiness
// (ToBoolean runs no user code, so the probe observes nothing the unit could tell)
export const outcomeOf = (entry, v) => (entry?.mode === 'nullish' ? v === null || v === undefined : !!v) ? 'T' : 'F';

// ----- the diff: the lines of each side a line diff of the two files changes (Myers, prefix and suffix trimmed) -----
export function changedLines(aText, bText, maxD = 4000) {
  const a = aText.split('\n').map((l) => l.trimEnd()), b = bText.split('\n').map((l) => l.trimEnd());
  let pre = 0; while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0; while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const A = a.slice(pre, a.length - suf), B = b.slice(pre, b.length - suf), N = A.length, M = B.length;
  const out = { parent: new Set(), candidate: new Set() };
  const all = () => { A.forEach((_, i) => out.parent.add(pre + i + 1)); B.forEach((_, j) => out.candidate.add(pre + j + 1)); return out; };
  if (!N || !M) return all();
  const off = N + M, trace = [];
  let v = new Int32Array(2 * off + 2).fill(-1); v[off + 1] = 0;
  let done = false;
  for (let d = 0; d <= Math.min(maxD, N + M) && !done; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < N && y < M && A[x] === B[y]) { x++; y++; }
      v[off + k] = x;
      if (x >= N && y >= M) { done = true; break; }
    }
  }
  if (!done) return all();
  let x = N, y = M; // walk back: every horizontal step deletes a line of A (the parent), every vertical one inserts a line of B
  for (let d = trace.length - 1; d > 0 && (x > 0 || y > 0); d--) {
    const vv = trace[d], k = x - y;
    const prevK = k === -d || (k !== d && vv[off + k - 1] < vv[off + k + 1]) ? k + 1 : k - 1;
    const px = vv[off + prevK], py = px - prevK;
    while (x > px && y > py) { x--; y--; }
    if (x === px) out.candidate.add(pre + py + 1); else out.parent.add(pre + px + 1);
    x = px; y = py;
  }
  return out;
}

// ----- the target branches of a unit on one side, and the literals of its text -----
const touches = (r, lines) => { if (!r) return false; for (let L = r[0]; L <= r[1]; L++) if (lines.has(L)) return true; return false; };
export function unitBranches(sf, unit, table, changed) {
  const u = topLevelFunctions(sf).get(unit);
  const node = u && (u.node ?? u.fn);
  if (!node) return { targets: [], literals: { strings: [], numbers: [], near: { strings: [], numbers: [] } } };
  const from = node.getStart(sf), to = node.end;
  const targets = [];
  for (const e of table) {
    if (e.start < from || e.end > to) continue;
    const own = touches(e.cond, changed);
    for (const [o, arms] of Object.entries(e.arms)) if (own || arms.some((r) => touches(r, changed))) targets.push(`${e.k}${o}`);
  }
  const strings = new Set(), numbers = new Set();
  const near = { strings: new Set(), numbers: new Set() }; // the literals inside a target condition: the values that decide it come first
  const conds = table.filter((e) => targets.some((t) => Number(t.slice(0, -1)) === e.k)).map((e) => [e.cs, e.ce]);
  const walk = (n) => {
    const inCond = conds.some(([a, b]) => n.pos >= a && n.end <= b);
    if (inCond && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))) near.strings.add(n.text);
    if (inCond && ts.isNumericLiteral(n)) near.numbers.add(ts.isPrefixUnaryExpression(n.parent) && n.parent.operator === ts.SyntaxKind.MinusToken ? -Number(n.text) : Number(n.text));
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) strings.add(n.text);
    else if (ts.isNumericLiteral(n)) { const v = Number(n.text); numbers.add(ts.isPrefixUnaryExpression(n.parent) && n.parent.operator === ts.SyntaxKind.MinusToken ? -v : v); }
    else if (ts.isTemplateExpression(n)) { if (n.head.text) strings.add(n.head.text); for (const s of n.templateSpans) if (s.literal.text) strings.add(s.literal.text); }
    ts.forEachChild(n, walk);
  };
  walk(node);
  return { targets, literals: { strings: [...strings], numbers: [...numbers], near: { strings: [...near.strings], numbers: [...near.numbers] } } };
}
// the search's plan for a pair: the branch table of each file, the targets (side-tagged: P parent, C candidate) and the
// literals of both versions of the unit
export function searchPlan(parent, candidate, unit, readText) {
  const tP = readText(parent), tC = readText(candidate);
  const sfP = ts.createSourceFile(parent, tP, ts.ScriptTarget.Latest, true, parent.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const sfC = ts.createSourceFile(candidate, tC, ts.ScriptTarget.Latest, true, candidate.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const ch = changedLines(tP, tC);
  const tables = { P: branchTable(sfP), C: branchTable(sfC) };
  const bP = unitBranches(sfP, unit, tables.P, ch.parent), bC = unitBranches(sfC, unit, tables.C, ch.candidate);
  const targets = [...bP.targets.map((t) => `P:${t}`), ...bC.targets.map((t) => `C:${t}`)];
  const strings = [...new Set([...bC.literals.strings, ...bP.literals.strings])], numbers = [...new Set([...bC.literals.numbers, ...bP.literals.numbers])];
  const near = { strings: [...new Set([...bC.literals.near.strings, ...bP.literals.near.strings])], numbers: [...new Set([...bC.literals.near.numbers, ...bP.literals.near.numbers])] };
  const describe = (tag) => { const [side, rest] = tag.split(':'); const k = Number(rest.slice(0, -1)); const e = tables[side][k]; return { side: side === 'P' ? 'parent' : 'candidate', line: e.cond[0], condition: e.text, outcome: rest.slice(-1) }; };
  return { files: { [path.resolve(parent)]: { tag: 'P', table: tables.P }, [path.resolve(candidate)]: { tag: 'C', table: tables.C } }, targets, literals: { strings, numbers, near }, changed: { parent: ch.parent.size, candidate: ch.candidate.size }, describe };
}

// ----- the changes of one input: leaves walked with their declared types -----
export const SAFE_EDGES = [0, -0, 1, -1, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER - 1, Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_VALUE]; // the boundaries of a number: zero of both signs, the unit, the safe integers on and just off each end, the largest and the smallest magnitudes
const isPlain = (v) => !!v && typeof v === 'object' && !v.__isFake && !Array.isArray(v) && (Object.getPrototypeOf(v) === null || Object.getPrototypeOf(Object.getPrototypeOf(v)) === null);
const optionsOf = (s, defs, d = 0) => { if (!s || d > 8) return []; if (s.kind === 'ref') return optionsOf(defs?.[s.key], defs, d + 1); if (s.kind === 'union') return s.options.flatMap((o) => optionsOf(o, defs, d + 1)); return [s]; };
const neighbours = (lit) => [...new Set([lit.toUpperCase(), lit.toLowerCase(), ` ${lit} `, lit + 'x', lit.slice(0, -1)])].filter((x) => x !== lit);
// the values a leaf of spec s holding v may take, each with its tier (1: the unit's own literals and the type's members,
// 2: the type's boundaries, 3: neighbours, by one and of a literal); only values the declared type admits
function leafValues(s, v, defs, lits, aware = true) {
  const out = [], seen = [];
  if (!aware) { lits = { strings: [], numbers: [] }; } // the --break of tests/search-inputs.mjs: no literal of the text, no boundary of the type
  const isNear = (x) => !!lits.near && (typeof x === 'string' ? lits.near.strings.includes(x) : lits.near.numbers.some((y) => Object.is(y, x)));
  const add = (tier, x) => { if (Object.is(x, v) || seen.some((y) => Object.is(y, x)) || !fits(s, x, defs)) return; seen.push(x); out.push({ tier: tier === 1 && isNear(x) ? 0 : tier, value: x }); }; // tier 0: a literal of a target condition
  const opts = optionsOf(s, defs);
  for (const o of opts) {
    if (o.kind === 'string') { for (const x of lits.strings) add(1, x); add(2, ''); for (const x of lits.strings) for (const y of neighbours(x)) add(3, y); }
    else if (o.kind === 'number') { for (const x of lits.numbers) add(1, x); if (aware) for (const x of SAFE_EDGES) add(2, x); if (typeof v === 'number' && Number.isFinite(v)) { add(3, v + 1); add(3, v - 1); } for (const x of lits.numbers) { add(3, x + 1); add(3, x - 1); } }
    else if (o.kind === 'boolean') { add(1, !v); add(1, true); add(1, false); }
    else if (o.kind === 'literal') for (const x of o.values) add(1, x);
    else if (o.kind === 'null') add(2, null);
    else if (o.kind === 'undefined') add(2, undefined);
  }
  return out;
}
const copyOf = (x, d = 0) => { if (d > 8) throw new Error('deep'); if (x === null || typeof x !== 'object') { if (typeof x === 'function') throw new Error('function'); return x; } if (x.__isFake) throw new Error('fake'); if (Array.isArray(x)) return x.map((y) => copyOf(y, d + 1)); if (!isPlain(x)) throw new Error('instance'); const o = Object.create(Object.getPrototypeOf(x)); for (const k of Object.keys(x)) o[k] = copyOf(x[k], d + 1); return o; };
export function changesOf(inputs, params, defs, lits, { maxDepth = 5, aware = true } = {}) {
  const out = [];
  if (!aware) lits = { strings: [], numbers: [] };
  const valuesOf = (s, v, d, l) => leafValues(s, v, d, l, aware);
  const walk = (v, s, at, d) => {
    if (d > maxDepth) return;
    const opts = optionsOf(s, defs);
    for (const c of valuesOf(s, v, defs, lits)) out.push({ at, op: 'set', value: c.value, tier: c.tier });
    if (v === null || v === undefined) { // an absent dictionary the type admits present: one entry keyed by a literal of the unit, its value one the value type admits
      const dict = opts.find((o) => o.kind === 'dict'), val = dict && valuesOf(dict.value, undefined, defs, lits)[0];
      if (val) for (const k of lits.strings) { const o = {}; o[k] = val.value; if (fits(s, o, defs)) out.push({ at, op: 'set', value: o, tier: lits.near?.strings.includes(k) ? 1 : 2 }); }
      return;
    }
    if (typeof v !== 'object' || v.__isFake) return;
    if (Array.isArray(v)) {
      const arr = opts.find((o) => o.kind === 'array'), tup = opts.find((o) => o.kind === 'tuple');
      if (tup) { v.slice(0, tup.items.length).forEach((x, i) => walk(x, tup.items[i], [...at, i], d + 1)); return; }
      if (!arr) return;
      v.slice(0, 3).forEach((x, i) => walk(x, arr.of, [...at, i], d + 1));
      if (v.length) { out.push({ at, op: 'pop', tier: 4 }, { at, op: 'shift', tier: 4 }); try { copyOf(v[v.length - 1]); out.push({ at, op: 'dup', tier: 4 }); } catch { /* an element lean cannot copy (a function, a fake) */ } }
      else { const first = valuesOf(arr.of, undefined, defs, lits)[0]; if (first) out.push({ at, op: 'push', value: first.value, tier: 4 }); }
      return;
    }
    if (!isPlain(v)) return;
    const rec = opts.find((o) => o.kind === 'record' && fits(o, v, defs)) ?? opts.find((o) => o.kind === 'record');
    if (rec) {
      for (const [k, fld] of Object.entries(rec.fields)) {
        if (Object.hasOwn(v, k)) { walk(v[k], fld.spec, [...at, k], d + 1); if (fld.optional) out.push({ at: [...at, k], op: 'delete', tier: 2 }); }
        else for (const c of valuesOf(fld.spec, undefined, defs, lits)) out.push({ at: [...at, k], op: 'set', value: c.value, tier: c.tier + 1 });
      }
      return;
    }
    const dict = opts.find((o) => o.kind === 'dict');
    if (dict) {
      const keys = Object.keys(v);
      keys.slice(0, 3).forEach((k) => walk(v[k], dict.value, [...at, k], d + 1));
      const fill = keys.length ? (() => { try { return { value: copyOf(v[keys[0]]) }; } catch { return null; } })() : (valuesOf(dict.value, undefined, defs, lits)[0] ?? null);
      if (fill) for (const k of lits.strings) if (!Object.hasOwn(v, k)) out.push({ at: [...at, k], op: 'set', value: fill.value, tier: lits.near?.strings.includes(k) ? 0 : 1 });
      for (const k of keys.slice(0, 3)) out.push({ at: [...at, k], op: 'delete', tier: 2 });
    }
  };
  params.forEach((p, i) => { if (i < inputs.length) walk(inputs[i], p.spec, [i], 0); });
  return out;
}
// one change applied to an input as drawn; false when its holder is no longer there (an earlier change removed it)
export function applyChange(inputs, c) {
  let holder = inputs;
  const keys = c.op === 'set' || c.op === 'delete' ? c.at.slice(0, -1) : c.at;
  for (const k of keys) { if (holder === null || typeof holder !== 'object' || holder.__isFake) return false; holder = holder[k]; }
  if (holder === null || typeof holder !== 'object' || holder.__isFake) return false;
  const last = c.at.at(-1);
  try {
    switch (c.op) {
      case 'set': holder[last] = c.value !== null && typeof c.value === 'object' ? copyOf(c.value) : c.value; return true;
      case 'delete': return delete holder[last];
      case 'pop': if (!Array.isArray(holder) || !holder.length) return false; holder.pop(); return true;
      case 'shift': if (!Array.isArray(holder) || !holder.length) return false; holder.shift(); return true;
      case 'dup': if (!Array.isArray(holder) || !holder.length) return false; holder.push(copyOf(holder[holder.length - 1])); return true;
      case 'push': if (!Array.isArray(holder)) return false; holder.push(c.value); return true;
    }
  } catch { return false; }
  return false;
}
export function applyRecipe(inputs, recipe) { for (const c of recipe.changes) if (!applyChange(inputs, c)) return false; return true; }
const valueText = (v) => (v === undefined ? 'undefined' : Object.is(v, -0) ? '-0' : typeof v === 'number' && !Number.isFinite(v) ? String(v) : JSON.stringify(v));
const changeText = (c) => `${c.at.map((k, i) => (i === 0 ? `arg${k}` : typeof k === 'number' ? `[${k}]` : `.${k}`)).join('')} ${c.op}${c.op === 'set' || c.op === 'push' ? ' ' + valueText(c.value) : ''}`;
export const recipeText = (r) => ({ from: r.from, changes: r.changes.map(changeText) });
const recipeKey = (r) => `${r.from}|${r.changes.map(changeText).join(';')}`;
// a change on a leaf the recipe already changed replaces that change, so a kept input's next step is one leaf away from it
const extend = (r, c) => { const k = JSON.stringify(c.at); const keep = r.changes.filter((x) => !(JSON.stringify(x.at) === k && ['set', 'delete'].includes(x.op) && ['set', 'delete'].includes(c.op))); return { from: r.from, changes: [...keep, c] }; };

// ----- the search -----
// start: the drawn inputs that ran on both sides, [{ input, hits }]; run(recipe) mounts both sides on the recipe's input,
// calls them and returns { status: 'equal' | 'diff' | 'skip', hits, ... }; changes(recipe) mounts one side and lists the
// changes of its input as drawn. Deterministic for a seed: the order of the entries, their changes and the tie-breaks
// come from the seed and the hits, never from the clock; the wall bound is a guard, and the summary names the bound that stopped it
export async function searchInputs({ seed = 1, targets, start, run, changes, maxInputs, maxMs, now = Date.now, keep = true }) { // keep false: the --break of tests/search-inputs.mjs, an input that reaches a new branch is not kept
  const T = new Set(targets), reached = new Set();
  for (const s of start) for (const h of s.hits) if (T.has(h)) reached.add(h);
  const before = reached.size;
  const summary = (stop, extra = {}) => ({ source: 'search', seed, targets: T.size, reachedByDraws: before, reached: reached.size, unreached: [...T].filter((t) => !reached.has(t)), tried: tried, kept: kept.length, stop, bound: { inputs: maxInputs, ms: maxMs }, ...extra });
  let tried = 0; const kept = [];
  if (!T.size) return summary('no target branch');
  if (reached.size === T.size) return summary('every target branch reached by the draws');
  const rng = makeRng((seed ^ 0x51ed270b) >>> 0);
  const gain = (hits) => [...hits].filter((h) => T.has(h)).length;
  const hitKey = (hits) => [...hits].sort().join(',');
  const order = start.map((s, j) => ({ s, j, g: gain(s.hits) })).sort((a, b) => b.g - a.g || a.j - b.j).map((x) => ({ recipe: { from: x.s.input, changes: [] }, base: hitKey(x.s.hits), ops: null }));
  const stack = order.reverse(); // the best drawn input on top; a kept input goes on top of everything
  const seen = new Set(stack.map((e) => recipeKey(e.recipe)));
  const t0 = now();
  // an entry's changes: by tier, and within a tier one change per leaf in turn (the leaves rotated by the seed), so no
  // leaf spends the budget before every other leaf had its first value
  const listFor = async (e) => {
    const all = await changes(e.recipe); if (!all) return [];
    const leaves = [...new Set(all.map((c) => JSON.stringify(c.at)))];
    const turn = leaves.length ? Math.floor(rng() * leaves.length) : 0;
    const rank = new Map(leaves.map((l, i) => [l, (i - turn + leaves.length) % leaves.length]));
    const nth = new Map(); // a change's place among its leaf's changes of the same tier
    const placed = all.map((c, i) => { const k = `${c.tier}|${JSON.stringify(c.at)}`; const m = nth.get(k) ?? 0; nth.set(k, m + 1); return { c, i, m, leaf: JSON.stringify(c.at) }; });
    return placed.sort((a, b) => a.c.tier - b.c.tier || a.m - b.m || rank.get(a.leaf) - rank.get(b.leaf) || a.i - b.i).map((x) => ({ c: x.c, leaf: x.leaf, done: false }));
  };
  // a leaf whose changes moved no branch outcome of the entry (every probe, either side) twice is inert: its other changes
  // wait until every live leaf's are tried
  const pick = (e) => { let fallback = null; for (const o of e.ops) { if (o.done) continue; if (!e.inert.has(o.leaf)) return o; fallback ??= o; } return fallback; };
  while (stack.length) {
    if (tried >= maxInputs) return summary('input bound');
    if (now() - t0 > maxMs) return summary('wall-time bound');
    const e = stack[stack.length - 1];
    if (!e.ops) { e.ops = await listFor(e); e.inert = new Set(); e.still = new Map(); }
    const o = pick(e);
    if (!o) { stack.pop(); continue; }
    o.done = true;
    const recipe = extend(e.recipe, o.c);
    const key = recipeKey(recipe); if (seen.has(key)) continue; seen.add(key);
    const r = await run(recipe); tried++;
    if (r.status === 'skip') continue;
    if (r.status === 'diff') return summary('divergence', { witness: r, recipe });
    if (hitKey(r.hits) === e.base) { const n = (e.still.get(o.leaf) ?? 0) + 1; e.still.set(o.leaf, n); if (n >= 2) e.inert.add(o.leaf); }
    const fresh = [...r.hits].filter((h) => T.has(h) && !reached.has(h));
    if (fresh.length) {
      fresh.forEach((h) => reached.add(h));
      kept.push({ recipe: recipeText(recipe), reached: fresh });
      if (keep) stack.push({ recipe, base: hitKey(r.hits), ops: null });
      if (reached.size === T.size) return summary('every target branch reached');
    }
  }
  return summary('no change left');
}
