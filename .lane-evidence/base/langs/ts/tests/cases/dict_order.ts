// A dictionary keeps its keys in property order (ECMA-262 10.1.11): array indices first, ascending, then the other
// keys in creation order. Run in Node and in Dafny on the same inputs (the differential step): Object.keys, for-in,
// Object.values after a spread, a deleted key written again.
export function keyOrder(xs: string[]): string {
  const d: Record<string, string> = {};
  for (const x of xs) {
    d[x] = x;
  }
  return Object.keys(d).join(',');
}
export function reinsertOrder(xs: string[]): string {
  const d: Record<string, string> = {};
  for (const x of xs) {
    d[x] = x;
  }
  delete d['a'];
  d['a'] = 'z';
  let out = '';
  for (const k in d) {
    out = out + k + ';';
  }
  return out + Object.values(d).join(',');
}
export function spreadOrder(xs: string[]): string {
  const src: Record<string, string> = {};
  for (const x of xs) {
    src[x] = x + '!';
  }
  const d: Record<string, string> = { b: 'b', ...src, a: 'a' };
  return Object.values(d).join(',');
}
