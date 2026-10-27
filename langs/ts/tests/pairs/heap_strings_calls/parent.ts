// The heap core, stage 4: replace, trim, join, filter and map on core values, through the library table's rows.
type Item = { id: string; n: number };

// the ids of the items with a positive count
export function ids(xs: Item[]): string[] {
  return xs.filter((x) => x.n > 0).map((x) => x.id);
}

// the ids of the items with a count above one
export function busy(xs: Item[]): string[] {
  return xs.filter((x) => x.n > 1).map((x) => x.id);
}

// a name cleaned of spaces with its first dash turned into a space
export function clean(s: string): string {
  return s.trim().replace("-", " ");
}

// the names as one line
export function line(xs: string[]): string {
  return xs.join(",");
}
