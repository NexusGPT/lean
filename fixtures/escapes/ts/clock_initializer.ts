// expect: toplevel-effect
/// <reference lib="dom" />
let started = performance.now();
export function elapsed(): number { return performance.now() - started; }
