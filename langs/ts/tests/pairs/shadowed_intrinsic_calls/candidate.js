'use strict';

// A CommonJS module that binds intrinsics at its top, as node's own lib does (`const { Object, ... } = primordials`),
// and calls methods at module scope. The loader's prologue (TypeScript's `Object.defineProperty(exports, "__esModule",
// ...)`) must read the global object's Object, never the file's binding in its dead zone, whatever the marks hoist above it.
const prim = { Object: globalThis.Object, Map: globalThis.Map };
const { Object, Map } = prim;
const registry = new Map();
registry.set('a', 1);
registry.set('b', 2);

/** @param {string} k */
function count(k) {
  const v = registry.get(k);
  return v === undefined ? -1 : v;
}

/** @param {{ [k: string]: number }} o */
function keysOf(o) { return Object.keys(o); }

module.exports = { count, keysOf };
