// stage 5 step 17: a tuple of one shape is an array whose length is fixed on entry; a tuple of mixed shapes is a
// record of its positions; an intersection of records is the record of all their fields, and a branded primitive is
// the primitive
export type Range = [number, number];
export type Entry = [string, number];
export type Tagged = { id: number } & { tag: string };
export type Id = string & { __brand: "Id" };

export function width(r: Range): number {
  return r[1] - r[0];
}

export function show(e: Entry): string {
  return `${e[0]}=${e[1]}`;
}

export function make(name: string, n: number): Entry {
  return [name, n];
}

export function tagOf(t: Tagged): string {
  return t.tag;
}

export function idLength(i: Id): number {
  return i.length;
}
