// Moonshot 1: a component with finite state is a Mealy machine (input: a click on a handler of the current tree;
// output: the tree). The product of parent and candidate is explored breadth-first over every click order from the
// same props; a differing tree is a WITNESS with the shortest click sequence; a closed exploration with no
// difference is PASS-decided over every sequence, with the number of state pairs visited.
//   node explore.mjs --parent a.tsx --candidate b.tsx --unit Toggle [--props '{"initial":false}'] [--max 500]
import path from 'node:path';
import { Environment, render } from '../../../exec/fake.mjs';
import { sandbox, pickUnit } from '../../../exec/run.mjs';
import { specOf } from '../../../exec/spec.mjs';
const a = process.argv.slice(2); const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const parent = path.resolve(opt('--parent')), candidate = path.resolve(opt('--candidate')), unit = opt('--unit'), props = JSON.parse(opt('--props', '{}')), MAX = Number(opt('--max', 500));
// a side: its environment, its unit, its hook slots (the state)
function side(file) {
  const env = new Environment(1); env.shapes = specOf(file, unit, { project: false });
  const exportsObj = sandbox(env, path.dirname(file)).load(file);
  const u = pickUnit(exportsObj, env.shapes, env); if (!u) throw Error(`${file}: unit ${unit} not found`);
  return { env, u };
}
const erase = (v) => (Array.isArray(v) ? v.map(erase) : v && typeof v === 'object' && Object.hasOwn(v, '$el') ? { $el: v.$el, props: Object.fromEntries(Object.entries(v.props).map(([k, x]) => [k, typeof x === 'function' ? 'fn' : erase(x)])), children: v.children.map(erase) } : v); // handler identity is not observable; its behaviour is explored by firing it
const handlers = (v, at = [], out = []) => { if (!v || typeof v !== 'object' || !Object.hasOwn(v, '$el')) return out; for (const [k, x] of Object.entries(v.props)) if (/^on[A-Z]/.test(k) && typeof x === 'function') out.push({ label: `${at.join('/')}:${k}`, fn: x }); v.children.forEach((c, i) => handlers(c, [...at, `${v.$el}[${i}]`], out)); return out; };
function renderOf(s, slots) { s.env.hookSlots = slots.slice(); s.env.react.__beginRender(); s.env.trace.length = 0; const v = s.u.call([props]); return { tree: v, slots: (s.env.hookSlots ?? []).slice() }; }
const P = side(parent), C = side(candidate);
const key = (sp, sc) => JSON.stringify([render(sp), render(sc)]);
const start = { sp: [], sc: [], path: [] };
const seen = new Set(); const queue = [start]; let pairs = 0;
while (queue.length) {
  const st = queue.shift();
  const rp = renderOf(P, st.sp), rc = renderOf(C, st.sc);
  const k = key(rp.slots, rc.slots); if (seen.has(k)) continue; seen.add(k); pairs++;
  if (pairs > MAX) { console.log(JSON.stringify({ verdict: 'ASK', reason: `more than ${MAX} state pairs`, unit })); process.exit(2); }
  const tp = JSON.stringify(erase(rp.tree)), tc = JSON.stringify(erase(rc.tree));
  if (tp !== tc) { console.log(JSON.stringify({ verdict: 'WITNESS', unit, props, clicks: st.path, parent: erase(rp.tree), candidate: erase(rc.tree), pairsVisited: pairs }, null, 1)); process.exit(0); }
  const hp = handlers(rp.tree), hc = handlers(rc.tree);
  if (hp.map((h) => h.label).join() !== hc.map((h) => h.label).join()) { console.log(JSON.stringify({ verdict: 'WITNESS', unit, props, clicks: st.path, reason: 'different handler sets', parent: hp.map((h) => h.label), candidate: hc.map((h) => h.label) })); process.exit(0); }
  for (let i = 0; i < hp.length; i++) {
    // fire the same handler on both sides from this state: a setter writes into the slot array of the render that made
    // the handler, so each click starts from a fresh render of the state, and the next state is that array afterwards
    const fire = (s, slots, label) => { const r = renderOf(s, slots); const h = handlers(r.tree)[i]; try { h.fn(s.env.fake(`react:event:${label}`)); } catch (e) { s.env.record('handler-throw', label, [String(e && e.message)]); } return (s.env.hookSlots ?? []).slice(); };
    queue.push({ sp: fire(P, st.sp, hp[i].label), sc: fire(C, st.sc, hc[i].label), path: [...st.path, hp[i].label] });
  }
}
console.log(JSON.stringify({ verdict: 'PASS-decided', unit, props, pairsVisited: pairs, note: 'every click sequence from these props, at the element-tree layer; handlers fired on a fake event; effects and the clock not modelled' }, null, 1));
