// expect: read-after-call
// A method call on an opaque value may change it, and a read after the call takes the object as the world holds it
// (design/alias-result.md, world read, 2026-10-30): `x.push(1); return x.length` on one named object is read, not refused.
// What stays refused is a read after the call of an object the reading cannot name: `box` is written more than once, so
// no single identity carries the world read.
export function grow(x: any, y: any, flag: boolean): number {
  let box = x;
  if (flag) box = y;
  box.push(1);
  return box.length;
}
