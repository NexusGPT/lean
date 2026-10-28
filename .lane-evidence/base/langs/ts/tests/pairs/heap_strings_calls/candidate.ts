// The heap core, stage 4: replace, trim, join, filter and map on core values, through the library table's rows.
type Item = { id: string; n: number };

// the filter kept under a name, the map written with a block body
export function ids(xs: Item[]): string[] {
  const kept = xs.filter((x) => x.n > 0);
  return kept.map((x) => {
    return x.id;
  });
}

// a count above zero: another predicate
export function busy(xs: Item[]): string[] {
  return xs.filter((x) => x.n > 0).map((x) => x.id);
}

// the trimmed name under a name first
export function clean(s: string): string {
  const t = s.trim();
  return t.replace("-", " ");
}

// join's default separator is the comma
export function line(xs: string[]): string {
  return xs.join();
}
