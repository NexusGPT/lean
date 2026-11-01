// in-place-mutation, graded `block` (design/w1a-opaque-mutation.md): the unit's body from the first statement that holds
// the finding or may touch a reference to its end is one opaque step keyed by its tokens and the same-file code it reaches.

export function outside(k: number): number[] { const a = k * 2; const xs = [a, 2]; return xs.reverse(); }
export function inside(k: number): number[] { const a = k * 2; const xs = [a, 2]; return xs.reverse(); }
export function planted(k: number): number[] { const a = k * 2; const xs = [a, 2]; return xs.reverse(); }
export function flows(k: number): number[] { const a = k * 2; const xs = [a, 2]; return xs.reverse(); }
