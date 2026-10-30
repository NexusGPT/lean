// aliased and otherAny of parent.ts with their names changed: equal in JavaScript, so lane B passes and lane A's own
// reading of the unit decides the row (refused read-after-call)
export function aliased(ev: any): boolean {
  const same = ev;
  ev.preventDefault();
  return same.defaultPrevented;
}

export function otherAny(a: any, b: any): number {
  a.bump();
  return b.x;
}
