// Stage 5 rank 17: a member read on a type parameter goes through its declared constraint (an uninterpreted field read,
// generic in the parameter); a read on an indexed this type takes the opaque path; a read on never is unreachable.
type Named = { id: string; n: number };

// a field read on a constrained type parameter, twice
export function idOf<T extends Named>(x: T): string {
  return x.id + ":" + String(x.n);
}

// a sum over the constraint's field
export function total<T extends { n: number }>(xs: T[]): number {
  let acc = 0;
  for (const x of xs) acc = acc + x.n;
  return acc;
}

// an indexed this type as a local's annotation: the read takes the opaque path
export class Box {
  options: { verbose: boolean } = { verbose: false };
  flag(): boolean {
    const o: this["options"] = this.options;
    return o.verbose;
  }
}

// untouched: the constraint's string field
export function tagOf<T extends { tag: string }>(x: T): string {
  return "[" + x.tag + "]";
}
