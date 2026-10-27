// The element-tree patch of a front-end WITNESS: the edit that turns the parent's rendered tree into the candidate's,
// so a reviewer reads what changed on the page instead of two serialised trees.
//
//   patch(parentTree, candidateTree) -> ops[]   (ops.reason holds why, when either side is not an element tree)
//
// The trees are the ones lane B observes (exec/run.mjs): an element is {$el, props, children} with `rendered` under
// --deep; children are text strings, elements and fakes; a root may be an array. A tree may be raw (sequence and
// finite observations, function props as functions or 'fn') or already rendered (the one-render observation, function
// props as {$fn} or an observed {$handler}). Children at one level are matched by their `key` prop when every child on
// both sides carries a distinct key, else by position. The ops, exactly five kinds:
//   insert     a node present in the candidate only (path in the candidate's tree)
//   remove     a node present in the parent only (the ancestors' path in the candidate's tree, the last index the parent's)
//   text       a text child whose string differs
//   attribute  a prop whose rendered value differs; a function prop is compared as 'fn', as the sequence observation does
//   move       a keyed child whose place among the kept keys changed (the kept keys outside a longest run in order)
// A changed tag at one position is a remove and an insert. A path is the child-index path from the root in the labels
// the handlers carry (exec/run.mjs treeHandlers): `[i]` under an array or a fragment, `div[i]` under a div, `C[i]` under
// a component; '' is the root itself. Values are printed with render (exec/fake.mjs), so a fake prints as its path.
import { render } from './exec/fake.mjs';

const KINDS = ['insert', 'remove', 'text', 'attribute', 'move'];
const MAX_DEPTH = 64, MAX_OPS = 500; // the walk is total: past the depth a differing subtree is one remove and one insert; past the op budget the list is cut and says so

const isFake = (v) => (typeof v === 'object' || typeof v === 'function') && v !== null && v.__isFake === true;
const isNode = (v) => !!v && typeof v === 'object' && !isFake(v) && !Array.isArray(v) && Object.hasOwn(v, '$el');
const isNothing = (v) => v === null || v === undefined || typeof v === 'boolean' || (!!v && typeof v === 'object' && !isFake(v) && v.$undefined === true && Object.keys(v).length === 1); // React renders nothing for these
const isText = (v) => typeof v === 'string' || typeof v === 'number';
const json = (v) => JSON.stringify(render(v));
// a function prop is compared as 'fn': a raw function, a rendered {$fn}, an observed {$handler}
const isFnValue = (v) => (typeof v === 'function' && !isFake(v)) || (!!v && typeof v === 'object' && !isFake(v) && (Object.hasOwn(v, '$fn') || Object.hasOwn(v, '$handler')));
const propValue = (v) => (isFnValue(v) ? 'fn' : render(v));
const tagOf = (n) => json(n.$el);
const segTag = (n) => (n && typeof n.$el === 'string' ? n.$el : 'C'); // treeHandlers' label of a child: the containing element's tag, 'C' for a component
const join = (prefix, seg) => (prefix ? `${prefix}/${seg}` : seg);

function keysOf(list) { // the keys of one level, or null when the level is not fully and distinctly keyed
  const out = [];
  for (const c of list) { if (!isNode(c) || !c.props || c.props.key === undefined || c.props.key === null) return null; out.push(json(c.props.key)); }
  return new Set(out).size === out.length ? out : null;
}

// the longest increasing run of a sequence of numbers: its members keep their relative order, every other kept key moved
function longestRun(seq) {
  const n = seq.length, len = new Array(n).fill(1), prev = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) if (seq[j] < seq[i] && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; }
  let best = -1; for (let i = 0; i < n; i++) if (best < 0 || len[i] > len[best]) best = i;
  const keep = new Set(); for (let i = best; i >= 0; i = prev[i]) keep.add(i);
  return keep;
}

function diffChildren(A, B, prefix, seg, st, depth) {
  const ka = keysOf(A), kb = keysOf(B);
  if (ka && kb && A.length && B.length) { // keyed: React's reconciliation identity
    const ia = new Map(ka.map((k, i) => [k, i])), ib = new Map(kb.map((k, j) => [k, j]));
    ka.forEach((k, i) => { if (!ib.has(k)) emit(st, { kind: 'remove', path: join(prefix, seg(i)), key: render(A[i].props.key), before: render(A[i]), after: null }); });
    const kept = kb.map((k, j) => [k, j]).filter(([k]) => ia.has(k));
    const inOrder = longestRun(kept.map(([k]) => ia.get(k)));
    let m = 0;
    kb.forEach((k, j) => {
      const p = join(prefix, seg(j));
      if (!ia.has(k)) { emit(st, { kind: 'insert', path: p, key: render(B[j].props.key), before: null, after: render(B[j]) }); return; }
      const i = ia.get(k);
      if (!inOrder.has(m)) emit(st, { kind: 'move', path: p, key: render(B[j].props.key), before: i, after: j });
      m++;
      diffNode(A[i], B[j], p, st, depth + 1);
    });
    return;
  }
  for (let i = 0; i < Math.max(A.length, B.length); i++) { // by position
    const p = join(prefix, seg(i));
    if (i >= B.length) emit(st, { kind: 'remove', path: p, before: render(A[i]), after: null });
    else if (i >= A.length) emit(st, { kind: 'insert', path: p, before: null, after: render(B[i]) });
    else diffNode(A[i], B[i], p, st, depth + 1);
  }
}

function diffNode(a, b, path, st, depth) {
  if (st.cut) return;
  if (isText(a) && isText(b)) { if (String(a) !== String(b)) emit(st, { kind: 'text', path, before: String(a), after: String(b) }); return; }
  if (isNode(a) && isNode(b) && tagOf(a) === tagOf(b) && depth < MAX_DEPTH) {
    const pa = a.props ?? {}, pb = b.props ?? {};
    for (const name of [...new Set([...Object.keys(pa), ...Object.keys(pb)])].sort()) {
      const x = Object.hasOwn(pa, name) ? propValue(pa[name]) : render(undefined), y = Object.hasOwn(pb, name) ? propValue(pb[name]) : render(undefined);
      if (JSON.stringify(x) !== JSON.stringify(y)) emit(st, { kind: 'attribute', path, name, before: x, after: y });
    }
    diffChildren(a.children ?? [], b.children ?? [], path, (i) => `${segTag(b)}[${i}]`, st, depth);
    if (Object.hasOwn(a, 'rendered') || Object.hasOwn(b, 'rendered')) diffRoot(a.rendered, b.rendered, join(path, 'rendered'), st, depth + 1); // --deep: the child component's own tree
    return;
  }
  if (json(eraseFns(a)) === json(eraseFns(b))) return; // the same fake, the same value
  emit(st, { kind: 'remove', path, before: render(a), after: null });
  emit(st, { kind: 'insert', path, before: null, after: render(b) });
}

function diffRoot(a, b, path, st, depth) {
  if (Array.isArray(a) || Array.isArray(b) || isNothing(a) || isNothing(b)) diffChildren(toList(a), toList(b), path, (i) => `[${i}]`, st, depth);
  else diffNode(a, b, path, st, depth);
}
const toList = (v) => (Array.isArray(v) ? v : isNothing(v) ? [] : [v]);
const eraseFns = (v) => (Array.isArray(v) ? v.map(eraseFns) : isNode(v) ? { ...v, props: Object.fromEntries(Object.entries(v.props ?? {}).map(([k, x]) => [k, isFnValue(x) ? 'fn' : x])), children: (v.children ?? []).map(eraseFns), ...(Object.hasOwn(v, 'rendered') ? { rendered: eraseFns(v.rendered) } : {}) } : v);
function emit(st, op) { if (st.cut) return; if (st.ops.length >= MAX_OPS) { st.cut = true; return; } st.ops.push(op); }

// a tree lane B can render: an element, an array, or (beside one) text or nothing
const treeish = (v) => isNode(v) || Array.isArray(v);
const rootish = (v) => treeish(v) || isNothing(v) || isText(v);

export function patch(parentTree, candidateTree) {
  const none = (reason) => Object.assign([], { reason });
  try {
    if (!rootish(parentTree)) return none('the parent did not render an element tree');
    if (!rootish(candidateTree)) return none('the candidate did not render an element tree');
    if (!treeish(parentTree) && !treeish(candidateTree)) return none('neither side rendered an element tree');
    const st = { ops: [], cut: false };
    diffRoot(parentTree, candidateTree, '', st, 0);
    if (st.cut) st.ops.cut = `more than ${MAX_OPS} ops; the list is cut`;
    return st.ops;
  } catch (e) { return none(`the trees could not be compared: ${String(e && e.message).slice(0, 120)}`); } // total: a value the walk does not know is a reason, never a throw
}

// one line: the count per kind, in the fixed order
export function summarize(ops) {
  const parts = KINDS.map((k) => [k, ops.filter((o) => o.kind === k).length]).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`);
  return parts.join(', ') + (ops.cut ? ` (${ops.cut})` : '');
}

const FIELD = { trace: 'the trace', pending: 'the pending work', heap: 'the object graph', receiver: 'the receiver', clock: 'the clock', threw: 'the thrown value', outcome: 'the outcome' };
// the tree an observation carries: a sequence or finite step ({tree}), a one-render call ({outcome: {returned}}), or a tree itself
function treeOf(x, side) {
  if (x === null || x === undefined) return { why: `the ${side} has no observation at this step` };
  if (treeish(x)) return { tree: x };
  if (typeof x !== 'object') return { why: `the ${side} did not render an element tree` };
  if (Object.hasOwn(x, 'tree')) return { tree: x.tree };
  if (x.outcome && Object.hasOwn(x.outcome, 'returned')) return { tree: x.outcome.returned };
  if (x.outcome && Object.hasOwn(x.outcome, 'threw')) return { why: `the ${side} threw` };
  if (Object.hasOwn(x, 'threw')) return { why: `the ${side} threw` };
  if (x.missing) return { why: `the ${side} has no handler ${x.command}` };
  if (x.harness) return { why: `the ${side} stopped: ${x.harness}` };
  if (x.command === 'unmount') return { why: 'no tree at the unmount step' };
  return { why: `the ${side} did not render an element tree` };
}

// the fields a witness gains: the patch and its one-line summary. An empty patch always says why, so it never reads as
// equality: no tree difference and which other part of the observation differs, or why there is no tree to compare.
export function witnessPatch(parentObs, candidateObs, otherwise = null) {
  try { return witnessPatchOf(parentObs, candidateObs, otherwise); } catch (e) { return { patch: [], patchSummary: `no patch: the observations could not be compared: ${String(e && e.message).slice(0, 120)}` }; } // total: a witness is never lost to its patch
}
function witnessPatchOf(parentObs, candidateObs, otherwise) {
  const p = treeOf(parentObs, 'parent'), c = treeOf(candidateObs, 'candidate');
  if (p.why || c.why) return { patch: [], patchSummary: `no patch: ${p.why ?? c.why}` };
  const ops = patch(p.tree, c.tree);
  if (ops.reason) return { patch: [], patchSummary: `no patch: ${ops.reason}` };
  if (ops.length) return { patch: ops, patchSummary: summarize(ops) };
  if (json(p.tree) !== json(c.tree)) return { patch: [], patchSummary: "no element difference; a handler's observed result differs" };
  const other = parentObs && candidateObs && typeof parentObs === 'object' && typeof candidateObs === 'object' && !Array.isArray(parentObs) && !treeish(parentObs)
    ? Object.keys(FIELD).filter((k) => k !== 'outcome' && (Object.hasOwn(parentObs, k) || Object.hasOwn(candidateObs, k)) && json(parentObs[k]) !== json(candidateObs[k])) : [];
  if (other.length) return { patch: [], patchSummary: `no tree difference; ${other.map((k) => FIELD[k]).join(' and ')} ${other.length > 1 ? 'differ' : 'differs'}` };
  return { patch: [], patchSummary: `no tree difference; ${otherwise ?? 'the difference is outside the tree'}` };
}

// one op on one line, path first
const short = (v, room = 100) => { const s = shortNode(v); return s.length > room ? s.slice(0, room - 3) + '...' : s; };
function shortNode(v) {
  if (typeof v === 'string') return JSON.stringify(v);
  if (isNode(v)) {
    const tag = typeof v.$el === 'string' ? (v.$el || 'fragment') : v.$el && v.$el.$component ? v.$el.$component : v.$el && v.$el.$fake ? v.$el.$fake : JSON.stringify(v.$el);
    const attrs = Object.entries(v.props ?? {}).map(([k, x]) => `${k}=${isFnValue(x) ? 'fn' : JSON.stringify(x)}`).join(' ');
    const kids = (v.children ?? []).map(shortNode).join(' ');
    return `<${tag}${attrs ? ' ' + attrs : ''}>${kids}</${tag}>`;
  }
  if (v && typeof v === 'object' && Object.hasOwn(v, '$fake')) return String(v.$fake);
  return JSON.stringify(v);
}
export function formatOp(op) {
  const at = op.path || '(root)';
  if (op.kind === 'insert') return `${at} insert ${short(op.after)}`;
  if (op.kind === 'remove') return `${at} remove ${short(op.before)}`;
  if (op.kind === 'text') return `${at} text ${short(op.before, 60)} to ${short(op.after, 60)}`;
  if (op.kind === 'attribute') return `${at} attribute ${op.name}: ${short(op.before, 60)} to ${short(op.after, 60)}`;
  if (op.kind === 'move') return `${at} move key ${short(op.key, 40)} from index ${op.before} to index ${op.after}`;
  return `${at} ${op.kind}`;
}
