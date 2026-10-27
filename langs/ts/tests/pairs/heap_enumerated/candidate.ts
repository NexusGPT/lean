// The heap layer, stage 2: structure enumerated before values. These units differ only on a shared or cyclic input.
export type Leaf = { v: number };
export type Node = { v: number; next: Node | null };
// reads b before writing a: differs from the parent only when a and b are one object
export function writeThenRead(a: Leaf, b: Leaf): number { const r = b.v; a.v = 1; return r; }
// the length of a list, walking next, at most 64 steps: on a cycle the parent stops at the cycle, the candidate at 64
export function length(n: Node | null): number { let k = 0; let cur = n; while (cur !== null && k < 64) { k = k + 1; cur = cur.next; } return k; }
// the sum of both leaves, read-only
export function total(a: Leaf, b: Leaf): number { return b.v + a.v; }
