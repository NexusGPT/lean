// expect: global-mutation
// a global no lib or @types package declares (a build-time define) is read from the world at Any, the opaque handle
// keyed by its name (design/w1e-opaque-this-globals.md, 2026-11-01; tests/pairs/opaque_global_read); a write into it
// stays refused: the function does not own it, and lane B's sandbox would not observe it
export function stamp(v: string): string {
  __APP_VERSION__ = v;
  return v;
}
