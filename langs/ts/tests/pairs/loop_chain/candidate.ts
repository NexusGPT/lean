// A loop that only guards and pushes is a filter and a map: the reshaped loop proves against its chain, a loop that also
// writes a second local keeps its own loop helper.
export type Item = { name: string; qty: number; open: boolean };

// a refactor: the loop as a filter and a map
export function labels(items: Item[]): string[] {
  return items.filter((it) => it.open).map((it) => it.name + ":" + it.qty);
}

// a refactor: the loop as a map
export function doubled(items: Item[]): number[] {
  return items.map((it) => 2 * it.qty);
}

// a refactor: the loop as a filter
export function positives(xs: number[]): number[] {
  return xs.filter((x) => !(x <= 0));
}

// a changed predicate: an order exactly at the minimum is now left out (> for >=)
export function large(items: Item[], min: number): string[] {
  return items.filter((it) => it.qty > min).map((it) => it.name);
}

// a refactor of the loop with a second write: the guard wraps the rest; the helper's body changes shape
export function numbered(items: Item[]): string[] {
  const out: string[] = [];
  let n = 0;
  for (const it of items) {
    if (it.open) {
      n += 1;
      out.push(n + ". " + it.name);
    }
  }
  return out;
}

// a refactor: the forEach as a filter and a map
export function openNames(items: Item[]): string[] {
  return items.filter((it) => it.open).map((it) => it.name);
}

// untouched
export function totalQty(items: Item[]): number {
  let t = 0;
  for (const it of items) t += it.qty;
  return t;
}
