// A file whose units reach different parts of it. Each unit reads only what it reaches: the sibling it does not
// call, and the record it does not take, are no part of its proof.
export interface Pt { x: number; y: number; z: number }

// reaches no record and no sibling: whole numbers only
export function balance(entries: number[]): number {
  return entries.reduce((total, entry) => total + entry, 0);
}

// two units that reach the record Pt
export function norm(p: Pt): number {
  return p.x + p.y;
}

export function lift(p: Pt): number {
  return p.y + 1;
}

// reaches no record and no sibling; the same text on both sides
export function tag(n: number): string {
  return "n=" + n;
}

// a new unit: it has no parent to compare with, and no other unit reads it
export function triple(n: number): number {
  return n * 3;
}
