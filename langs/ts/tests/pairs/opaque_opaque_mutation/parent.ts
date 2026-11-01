// opaque-mutation, graded `block` (design/w1a-opaque-mutation.md): the unit's body from the first statement that holds
// the finding or may touch a reference to its end is one opaque step keyed by its tokens and the same-file code it reaches.
function make(): any { return []; }
export function outside(k: number): number { const a = k * 2; const x = make(); const n = x.push(a); return a + (n > 1 ? 1 : 0); }
export function inside(k: number): number { const a = k * 2; const x = make(); const n = x.push(a); return a + (n > 1 ? 1 : 0); }
export function planted(k: number): number { const a = k * 2; const x = make(); const n = x.push(a); return a + (n > 1 ? 1 : 0); }
export function flows(k: number): number { const a = k * 2; const x = make(); const n = x.push(a); return a + (n > 1 ? 1 : 0); }
