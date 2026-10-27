// A value from outside the file, iterated by an array method whose callback may throw. Lane B hands an untyped
// parameter a fake; its forEach, map and reduce run the callback over the fake's elements like a real array, and a
// throw inside the callback is the unit's throw (exec/fake.mjs, design/fake-throw.md).
import { load } from "./store";

// the pyka repro, reduced: a forEach whose callback throws on an element, rewritten as a counted for
export function labels(rows: any): string[] {
  const out: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    out.push(r.name.toUpperCase());
  }
  return out;
}

// the candidate catches the throw inside the callback and returns a default
export function safeLabels(): string[] {
  const rows = load();
  return rows.map((r: any) => {
    try { return r.name.toUpperCase(); } catch { return ""; }
  });
}

// a reduce whose callback throws on the second element, rewritten as a counted for
export function total(rows: any): number {
  let acc = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (i === 1) throw new Error("second row");
    acc = acc + r.n;
  }
  return acc;
}

// untouched
export function count(rows: any): number {
  let n = 0;
  rows.forEach(() => { n = n + 1; });
  return n;
}

// an answer from outside, cast by the unit: drawn at the cast type, iterated by forEach, rewritten as a counted for
export async function queried(query: () => Promise<unknown>): Promise<string[]> {
  const rows = (await query()) as { name: string; tags: string[] }[];
  const out: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    out.push(r.name + r.tags.join(","));
  }
  return out;
}
