// Stage 5 rank 17: a member read on a type parameter goes through its declared constraint (an uninterpreted field read,
// generic in the parameter); a read on an indexed this type takes the opaque path; a read on never is unreachable.
type Named = { id: string; n: number };

// a refactor: the id read once into a local (the same value)
export function idOf<T extends Named>(x: T): string {
  const id = x.id;
  return id + ":" + String(x.n);
}

// changed behaviour: one more per element: a WITNESS on any non-empty array
export function total<T extends { n: number }>(xs: T[]): number {
  let acc = 0;
  for (const x of xs) acc = acc + x.n + 1;
  return acc;
}

// changed behaviour: the flag negated: a WITNESS on any box
export class Box {
  options: { verbose: boolean } = { verbose: false };
  flag(): boolean {
    const o: this["options"] = this.options;
    return !o.verbose;
  }
}

// untouched: the constraint's string field
export function tagOf<T extends { tag: string }>(x: T): string {
  return "[" + x.tag + "]";
}
