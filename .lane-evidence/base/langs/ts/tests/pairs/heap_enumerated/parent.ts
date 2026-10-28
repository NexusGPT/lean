// The heap layer, stage 2: structure enumerated before values. These units differ only on a shared or cyclic input.
export type Leaf = { v: number };
export type Node = { v: number; next: Node | null };
// reads b after writing a: differs from the candidate only when a and b are one object
export function writeThenRead(a: Leaf, b: Leaf): number { a.v = 1; return b.v; }
// the length of a list, walking next: on a cycle the parent stops at the cycle, the candidate does not
export function length(n: Node | null): number { let k = 0; let cur = n; const seen: Node[] = []; while (cur !== null && !seen.includes(cur)) { seen.push(cur); k = k + 1; cur = cur.next; } return k; }
// the sum of both leaves, read-only
export function total(a: Leaf, b: Leaf): number { return a.v + b.v; }
