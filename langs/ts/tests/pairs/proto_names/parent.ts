// An Object.prototype name read on a dictionary that does not own it reads that member through the prototype
// (ECMA-262 10.1.8 OrdinaryGet): `{}["toString"]` is one function, `{}["valueOf"]` another, any other missing key
// undefined. The value is a function of the key: two names, two values; one name, one value.

// a prototype name read with a default: the candidate reads another name
export function protoText(d: Record<string, number>): number {
  return d["toString"] ?? 0;
}

// the same prototype name through `??` and through a const binding tested against undefined
export function sameName(d: Record<string, number>): number {
  return d["toString"] ?? 0;
}

// a key the unit does not know: the candidate changes the default of a missing key that is no prototype name
export function entryOr(d: Record<string, number>, k: string): number {
  return d[k] ?? 0;
}

// a key the unit does not know: `??` against the `in` test, which a prototype name also passes
export function entryIn(d: Record<string, number>, k: string): number {
  return d[k] ?? 0;
}

// untouched: a prototype name read as a number
export function protoPlus(d: Record<string, number>): number {
  return d["valueOf"] + 1;
}

// two keys the unit does not know, compared by their values
export function sameValue(d: Record<string, number>, a: string, b: string): boolean {
  return (d[a] ?? 0) === (d[b] ?? 0);
}
