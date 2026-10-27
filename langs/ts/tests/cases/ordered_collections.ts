// Stage 5 rank 22: a Map and a Set as ordered collections, run in Node and in Dafny on the same inputs (the
// differential step): a new key goes last, an old key keeps its place, a deleted key set again goes last, and a Set
// keeps the first place of a repeated item.
export function orderCode(xs: number[]): number {
  const m = new Map<number, number>();
  for (const x of xs) {
    m.set(x % 5, (m.get(x % 5) ?? 0) + 1);
  }
  let code = 0;
  for (const [k, v] of m) {
    code = code * 100 + k * 10 + v;
  }
  return code;
}
export function distinctCode(xs: number[]): number {
  let code = 0;
  for (const x of [...new Set(xs)]) {
    code = code * 10 + x;
  }
  return code + new Set(xs).size * 100000;
}
export function reinsertCode(xs: number[]): number {
  const m = new Map<number, number>();
  for (const x of xs) {
    m.set(x, x);
  }
  m.delete(1);
  m.set(1, 1);
  m.set(2, 20);
  let code = 0;
  for (const k of m.keys()) {
    code = code * 10 + k;
  }
  return code * 1000 + Array.from(m.values()).reduce((a, b) => a + b, 0);
}
