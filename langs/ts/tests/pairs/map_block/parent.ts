// a map with a block callback, in a unit that changes a parameter or touches the outside: the callback's return is
// its own value, the changed parameter and the world stay with the unit
export interface Tag { label: string }
export interface Item { ok: boolean; tag: Tag; size: number }
interface Log { note(s: string): void }

export function labels(items: Item[], seen: number[]): string[] {
  seen.push(items.length);
  return items.map((x) => { if (x.ok) { return x.tag.label; } return ""; });
}

export function sizes(items: Item[], seen: number[]): number[] {
  seen.push(items.length);
  return items.map((x) => { const s = x.size; return s + 1; });
}

export function noted(items: Item[], log: Log): string[] {
  log.note("start");
  return items.map((x) => { const t = x.tag; return t.label; });
}

export function width(xs: number[]): number {
  return xs.length;
}
