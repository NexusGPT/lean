// executable companion to the handwritten heap toy; production lane B is unchanged
import assert from 'node:assert/strict';
import { observe } from '../exec/run.mjs';
import { Environment } from '../exec/fake.mjs';

function parent(user, tags) { user.tags = [...user.tags, 'new']; return user.tags.length; }
function candidate(user, tags) { tags.push('new'); return user.tags.length; }
function refactor(user, tags) { const alias = user.tags; const xs = [...alias, 'new']; user.tags = xs; return xs.length; }
function direct(user, tags) { user.tags.push('new'); return user.tags.length; }

// retain every pre-call object, including descendants disconnected by the call
// input identities are fixed; fresh objects are named by ordered observation traversal
function observation(args) {
  const ids = new Map(), objects = [];
  const ref = value => {
    if (value === null || typeof value !== 'object') return value;
    if (!ids.has(value)) { ids.set(value, objects.length); objects.push(value); }
    return { ref: ids.get(value) };
  };
  const fields = value => Array.isArray(value) ? value.map(ref) : Object.fromEntries(Object.keys(value).sort().map(k => [k, ref(value[k])]));
  const roots = args.map(ref);
  for (let i = 0; i < objects.length; i++) fields(objects[i]);
  const anchors = objects.length;
  return result => {
    const outcome = ref(result), heap = [];
    for (let i = 0; i < objects.length; i++) heap.push({ kind: Array.isArray(objects[i]) ? 'array' : 'record', fields: fields(objects[i]) });
    return { roots, anchors, outcome, heap };
  };
}
function graphRun(fn, initial, second = true) {
  const tags = [...initial], user = { tags }, args = second ? [user, tags] : [user];
  const after = observation(args);
  return after(fn(...args));
}
async function legacyRun(fn, initial, second = true) {
  const tags = [...initial], user = { tags }, args = second ? [user, tags] : [user];
  return observe({ env: new Environment(1), unit: { call: a => fn(...a), receiver: null } }, {}, args, 2000);
}
const samples = [[], ['a'], ['a', 'b', 'a']];
for (const initial of samples) {
  assert.notDeepEqual(await legacyRun(parent, initial), await legacyRun(candidate, initial));
  assert.deepEqual(await legacyRun(parent, initial), await legacyRun(refactor, initial));
  assert.deepEqual(await legacyRun(candidate, initial), await legacyRun(direct, initial));
  assert.notDeepEqual(graphRun(parent, initial), graphRun(candidate, initial));
  assert.deepEqual(graphRun(parent, initial), graphRun(refactor, initial));
  assert.deepEqual(graphRun(candidate, initial), graphRun(direct, initial));
}
console.log(`lane B observe, explicit shared inputs: WITNESS / PASS-bounded fresh refactor / PASS-bounded alias refactor (${samples.length} inputs each)`);
console.log(`graph prototype: different / equal fresh refactor / equal alias refactor (${samples.length} inputs each)`);
// without a second argument, the old array still belongs to SEMANTICS item 2
function copy(user) { user.tags = [...user.tags, 'new']; return user.tags.length; }
function push(user) { user.tags.push('new'); return user.tags.length; }
assert.deepEqual(await legacyRun(copy, [], false), await legacyRun(push, [], false));
assert.notDeepEqual(graphRun(copy, [], false), graphRun(push, [], false));
// a returned existing object and a returned copy have different correspondences
assert.deepEqual(await legacyRun(user => user, [], false), await legacyRun(user => ({ tags: user.tags }), [], false));
assert.notDeepEqual(graphRun(user => user, [], false), graphRun(user => ({ tags: user.tags }), [], false));
// repeated references retain their target, including cycles
const x = {}, y = {}; x.self = x; y.self = y;
assert.deepEqual(observation([x, x])(x), observation([y, y])(y));
assert.notDeepEqual(observation([x, x])(x), observation([x, y])(x));
console.log('observation probes: detached descendant and result/input identity missed by current observe; detected by graph prototype; cycles preserved');
