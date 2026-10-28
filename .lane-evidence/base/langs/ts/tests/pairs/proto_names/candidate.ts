// An Object.prototype name read on a dictionary that does not own it reads that member through the prototype
// (ECMA-262 10.1.8 OrdinaryGet): `{}["toString"]` is one function, `{}["valueOf"]` another, any other missing key
// undefined. The value is a function of the key: two names, two values; one name, one value.

// changed: another prototype name, another member (Node: "function toString..." against "function valueOf...")
export function protoText(d: Record<string, number>): number {
  return d["valueOf"] ?? 0;
}

// refactor: the same name, the read bound by const and tested against undefined
export function sameName(d: Record<string, number>): number {
  const v = d["toString"];
  return v === undefined ? 0 : v;
}

// changed: a missing key that is no prototype name reads 1, not 0
export function entryOr(d: Record<string, number>, k: string): number {
  return d[k] ?? 1;
}

// refactor: `k in d` holds for an own key and for a prototype name, and the read then gives that key's value
export function entryIn(d: Record<string, number>, k: string): number {
  return k in d ? d[k] : 0;
}

// untouched: a prototype name read as a number
export function protoPlus(d: Record<string, number>): number {
  return d["valueOf"] + 1;
}

// changed: two inherited prototype names are taken as one value (Node: toString against valueOf on {} is false in the
// parent, true here; on the base lane A proved the two equal, one absent value for every name)
export function sameValue(d: Record<string, number>, a: string, b: string): boolean {
  const inherited = a in d && b in d && !Object.prototype.hasOwnProperty.call(d, a) && !Object.prototype.hasOwnProperty.call(d, b);
  return inherited ? true : (d[a] ?? 0) === (d[b] ?? 0);
}
