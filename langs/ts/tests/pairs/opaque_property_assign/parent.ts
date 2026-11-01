// property-assign, graded `block` (design/w1a-opaque-mutation.md): the unit's body from the first statement that holds
// the finding or may touch a reference to its end is one opaque step keyed by its tokens and the same-file code it reaches.
type Box = { n: number; tags: number[]; inner: { v: number } };
export function outside(b: Box, k: number): number { const a = k * 2; b.n ||= a; return b.n + a; }
export function inside(b: Box, k: number): number { const a = k * 2; b.n ||= a; return b.n + a; }
export function planted(b: Box, k: number): number { const a = k * 2; b.n ||= a; return b.n + a; }
export function flows(b: Box, k: number): number { const a = k * 2; b.n ||= a; return b.n + a; }
