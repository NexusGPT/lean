// Lane B, heap layer stage 1: the reachable object graph of one call, observed as a graph rather than as separate
// renderings of each argument.
//
// Before the call, every object reachable from the roots (the arguments, in order) is registered and named by its
// position in one deterministic traversal: roots in order, then each object's edges in order (array index, Map
// insertion order, record key insertion order). After the call, the traversal runs again from the roots, the
// receiver's own fields and the outcome, and then from every pre-call object (an anchor), so an object the call
// disconnected is still observed. Pre-call objects keep their names; a fresh object is named by its first sight in the
// after-traversal. Two runs whose graphs are the same up to a renaming of fresh objects therefore serialise to the same
// text: the traversal order is the renaming (SEMANTICS.md, observation item 2: aliasing counts, addresses never do).
//
// Leaves (primitives, fakes, functions, dates, regexes, errors, promises) render as before (fake.mjs render).
// Nodes are plain records, arrays, Maps and Sets. A graph beyond the size budget is a budget error, so the harness
// answers ASK rather than comparing a truncated picture.
import { render, BudgetError } from './fake.mjs';

const MAX_OBJECTS = 4000;

export function isNode(v) {
  if (v === null || typeof v !== 'object') return false;
  if (v.__isFake) return false;
  if (v instanceof Date || v instanceof RegExp || v instanceof Error || v instanceof Promise) return false;
  if (typeof v.then === 'function') return false;
  if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer) return false;
  return Array.isArray(v) || v instanceof Map || v instanceof Set || isPlainProto(Object.getPrototypeOf(v)) || isPlainInstance(v);
}
// a plain object's prototype: the host's Object.prototype, a vm context's own (a literal written inside the sandbox has that realm's), or null
const isPlainProto = (p) => p === null || p === Object.prototype || (Object.getPrototypeOf(p) === null && typeof p.constructor === 'function' && p.constructor.name === 'Object' && p.constructor.prototype === p);
// an instance of a user class (fields on the object, methods on the prototype) is a node too: its identity matters
function isPlainInstance(v) {
  const p = Object.getPrototypeOf(v);
  return p !== null && !isPlainProto(p) && typeof p.constructor === 'function' && p.constructor !== Object && !(v instanceof Map) && !(v instanceof Set) && !Array.isArray(v) && Object.prototype.toString.call(v) === '[object Object]';
}

export class Graph {
  constructor() { this.ids = new Map(); this.objects = []; this.anchors = 0; }
  // the name of a value in the serialisation: a ref for a node, a rendering for a leaf
  name(v) {
    if (!isNode(v)) return render(v);
    if (!this.ids.has(v)) {
      if (this.objects.length >= MAX_OBJECTS) throw new BudgetError(`more than ${MAX_OBJECTS} reachable objects`);
      this.ids.set(v, this.objects.length); this.objects.push(v);
    }
    return { $ref: this.ids.get(v) };
  }
  // the edges of a node, in order, each target named (and registered on first sight)
  edges(v) {
    if (Array.isArray(v)) return v.map((x) => this.name(x));
    if (v instanceof Map) return [...v.entries()].map(([k, x]) => [this.name(k), this.name(x)]);
    if (v instanceof Set) return [...v].map((x) => this.name(x));
    const out = {};
    for (const k of Object.keys(v)) out[k] = this.name(v[k]);
    return out;
  }
  kind(v) { return Array.isArray(v) ? 'array' : v instanceof Map ? 'map' : v instanceof Set ? 'set' : isPlainProto(Object.getPrototypeOf(v)) ? 'record' : `instance:${Object.getPrototypeOf(v).constructor.name}`; } // a literal made inside the sandbox and an object made by the host (a clone, a parse) are both records
  // register everything reachable from the roots; returns the roots' names
  walk(roots) {
    const names = roots.map((r) => this.name(r));
    for (let i = 0; i < this.objects.length; i++) this.edges(this.objects[i]); // the worklist is the object list itself
    return names;
  }
  // before the call: the anchors are every object reachable from the arguments
  before(args) { this.walk(args); this.anchors = this.objects.length; return this; }
  // after the call: roots first (arguments, receiver fields, the outcome), then the anchors, so a detached pre-call
  // object is still serialised; fresh objects are named in order of first sight
  after(args, receiverOwn, outcomeValue, hasOutcome) {
    const roots = this.walk(args);
    const own = {}; for (const k of Object.keys(receiverOwn ?? {})) own[k] = this.name(receiverOwn[k]);
    const outcome = hasOutcome ? this.name(outcomeValue) : null;
    for (let i = 0; i < this.objects.length; i++) this.edges(this.objects[i]);
    const heap = this.objects.map((o) => ({ kind: this.kind(o), edges: this.edges(o) }));
    return { roots, own, outcome, anchors: this.anchors, heap };
  }
}
