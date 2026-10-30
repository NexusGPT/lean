// The three false-proof units of parent.ts with their locals renamed: equal in JavaScript, so lane B passes and lane
// A's own reading of the unit decides the row (refused reference-key since the erased-reference rule)
export type Rec = { a: number };

export function countByKey(n: number): number {
  const counts: Map<string, number> = new Map();
  const first: Rec = { a: n };
  const second: Rec = { a: n };
  counts.set(first as any, 1);
  counts.set(second as any, 1);
  return counts.size;
}

export function setByKey(n: number): number {
  const seen: Set<string> = new Set();
  const first: Rec = { a: n };
  const second: Rec = { a: n };
  seen.add(first as any);
  seen.add(second as any);
  return seen.size;
}

export function hasOther(n: number): boolean {
  const counts: Map<string, number> = new Map();
  const first: Rec = { a: n };
  const second: Rec = { a: n };
  counts.set(first as any, 1);
  return counts.has(second as any);
}
