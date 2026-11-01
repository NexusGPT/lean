// mutator-value, graded `block` (design/w1a-opaque-mutation.md): the unit's body from the first statement that holds
// the finding or may touch a reference to its end is one opaque step keyed by its tokens and the same-file code it reaches.

export function outside(xs: number[], k: number): number { const a = k * 2; const local = [...xs]; return a + (k > 2 ? local.pop() ?? 0 : 0); }
export function inside(xs: number[], k: number): number { const a = k * 2; const local = [...xs]; return a + (k > 2 ? local.pop() ?? 0 : 0); }
export function planted(xs: number[], k: number): number { const a = k * 2; const local = [...xs]; return a + (k > 2 ? local.pop() ?? 0 : 0); }
export function flows(xs: number[], k: number): number { const a = k * 2; const local = [...xs]; return a + (k > 2 ? local.pop() ?? 0 : 0); }
