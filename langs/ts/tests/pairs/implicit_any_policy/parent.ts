// Values strict mode alone types as unknown or any: a catch binding (unknown only under strict), a rest parameter
// without a type (TS7019) and a local referenced in its own initializer (TS7022). Each is opaque, read the same way
// on both sides.
// the caught value's message, read on the opaque binding and compared with a literal
export function failure(n: number): number {
  try {
    if (n < 0) throw new Error("negative");
    return 2;
  } catch (e) {
    return e.message === "negative" ? 1 : 0;
  }
}
// the caught message through a local
export function reason(n: number): number {
  try {
    if (n > 10) throw new Error("large");
    return 0;
  } catch (e) {
    const m = e.message;
    return m === "large" ? 2 : 1;
  }
}
// untouched: an untyped rest parameter
export function arity(...items): number { return items.length; }
// untouched: a local referenced in its own initializer, through the recursion
export function depth(n: number) { const d = n > 0 ? depth(n - 1) : 0; return d; }
