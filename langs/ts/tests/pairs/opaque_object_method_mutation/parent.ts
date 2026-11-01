// object-method-mutation, graded `block` (design/w1a-opaque-mutation.md): the unit's body from the first statement that holds
// the finding or may touch a reference to its end is one opaque step keyed by its tokens and the same-file code it reaches.

export const Outside = { n: 1, bump(k: number): number { const a = k * 2; this.n = a; return this.n + a; } };
export const Inside = { n: 1, bump(k: number): number { const a = k * 2; this.n = a; return this.n + a; } };
export const Planted = { n: 1, bump(k: number): number { const a = k * 2; this.n = a; return this.n + a; } };
export const Flows = { n: 1, bump(k: number): number { const a = k * 2; this.n = a; return this.n + a; } };
export function reader(k: number): number { Outside.bump(k); return Outside.n; }
