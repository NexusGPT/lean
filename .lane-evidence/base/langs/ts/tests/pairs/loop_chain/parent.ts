// A loop that only guards and pushes is a filter and a map: the reshaped loop proves against its chain, a loop that also
// writes a second local keeps its own loop helper.
export type Item = { name: string; qty: number; open: boolean };

// guard and push: the open items' labels
export function labels(items: Item[]): string[] {
  const out: string[] = [];
  for (const it of items) {
    if (!it.open) continue;
    out.push(it.name + ":" + it.qty);
  }
  return out;
}

// push only: every quantity doubled
export function doubled(items: Item[]): number[] {
  const out: number[] = [];
  for (const it of items) out.push(it.qty * 2);
  return out;
}

// guard only, the element pushed: the positive amounts
export function positives(xs: number[]): number[] {
  const kept: number[] = [];
  for (const x of xs) {
    if (x > 0) {
      kept.push(x);
    }
  }
  return kept;
}

// guard and push: the names of large orders
export function large(items: Item[], min: number): string[] {
  const out: string[] = [];
  for (const it of items) {
    if (it.qty < min) continue;
    out.push(it.name);
  }
  return out;
}

// a second write: the counter numbers the lines, so the loop is not a filter and a map
export function numbered(items: Item[]): string[] {
  const out: string[] = [];
  let n = 0;
  for (const it of items) {
    if (!it.open) continue;
    n += 1;
    out.push(n + ". " + it.name);
  }
  return out;
}

// forEach with a guard and a push: the same reading as the for-of
export function openNames(items: Item[]): string[] {
  const out: string[] = [];
  items.forEach((it) => {
    if (!it.open) return;
    out.push(it.name);
  });
  return out;
}

// untouched
export function totalQty(items: Item[]): number {
  let t = 0;
  for (const it of items) t += it.qty;
  return t;
}
