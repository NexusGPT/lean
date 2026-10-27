// expect: unsupported-call
// Map.forEach calls back with (value, key, map); the loop reading binds one element, so the callback form stays out:
// write for (const [k, v] of m)
export function total(m: Map<string, number>): number {
  let sum = 0;
  m.forEach((v) => {
    sum = sum + v;
  });
  return sum;
}
