// A module let whose initializer has an effect is a world field like any module let: its value at entry is the world's,
// never the initializer's (design/module-forms.md: no initial-state axiom), and the field is keyed by its declaration
// text, so a changed initializer is another field. The initializer runs at load, the module's effect; a unit reading or
// writing the field is graded (w1e, design/w1e-opaque-this-globals.md). Before, every such unit was refused
// toplevel-effect.
let started = Date.now();
let seed = Math.random();

// (a) the field read is unchanged; the candidate inlines the local
export function elapsed(now: number): number {
  const s = started;
  return now - s;
}

// (b) the candidate changes the field's declaration (its initializer): another field, never equal
export function jitter(n: number): number {
  return n + seed;
}

// (c) the candidate is mutate.mjs's planted change in the field's use (an operator)
export function since(now: number): number {
  return now - started;
}

// (d) a write of the field, then a read: unchanged, the change is outside
export function restart(now: number): number {
  started = now;
  const k = now + 1;
  return k;
}
