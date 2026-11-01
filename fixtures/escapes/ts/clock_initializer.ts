// expect: toplevel-state
/// <reference lib="dom" />
// a clock read in a module let's initializer is the module's load-time effect: a unit reading the field reads the
// world's value, never the clock's (design/w1e-opaque-this-globals.md, 2026-11-01); bound by a pattern, the module
// state stays refused
let [started] = [performance.now()];
export function elapsed(): number { return performance.now() - started; }
