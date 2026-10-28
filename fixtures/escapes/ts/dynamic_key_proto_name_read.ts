// expect: prototype
// a literal key that names a member of Object.prototype reads that member on a dictionary that does not own it:
// `{}["toString"]` is a function and `{}["valueOf"]` another, which one absent value of the value type cannot tell apart
export function sizeOf(d: Record<string, number>): number {
  return d["toString"] ?? 0;
}
