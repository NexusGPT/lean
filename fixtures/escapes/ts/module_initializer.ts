// expect: toplevel-state
// a module let with an effectful initializer is a world field like any module let, keyed by its declaration text
// (design/w1e-opaque-this-globals.md, 2026-11-01; tests/pairs/opaque_toplevel_effect); module state bound by a pattern
// has no field per name and stays refused
let { counter } = { counter: Date.now() };
export function initialCounter(): number { return counter; }
