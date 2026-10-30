// A record written `as any` as the key of a string-keyed Map or Set (design/type-assertions.md)
export type Rec = { a: number };

export function countByKey(n: number): number {
  const m: Map<string, number> = new Map();
  const r1: Rec = { a: n };
  const r2: Rec = { a: n };
  m.set(r1 as any, 1);
  m.set(r2 as any, 1);
  return m.size;
}

export function countByString(n: number): number {
  const m: Map<string, number> = new Map();
  const r1: Rec = { a: n };
  const r2: Rec = { a: n };
  m.set(String(r1) as any, 1);
  m.set(String(r2) as any, 1);
  return m.size;
}

export function setByKey(n: number): number {
  const s: Set<string> = new Set();
  const r1: Rec = { a: n };
  const r2: Rec = { a: n };
  s.add(r1 as any);
  s.add(r2 as any);
  return s.size;
}

export function hasOther(n: number): boolean {
  const m: Map<string, number> = new Map();
  const r1: Rec = { a: n };
  const r2: Rec = { a: n };
  m.set(r1 as any, 1);
  return m.has(r2 as any);
}

export function countByNumber(n: number): number {
  const m: Map<string, number> = new Map();
  m.set(n as any, 1);
  m.set(String(n) as any, 1);
  return m.size;
}
