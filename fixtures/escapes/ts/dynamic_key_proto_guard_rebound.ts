// expect: prototype
// the test against '__proto__' guards the write only when the key at the write is the key tested: a parameter assigned
// in the function may hold '__proto__' again after the test, and a null written there replaces the prototype
export function clear(k: string, alias: string): number {
  const d: Record<string, number | null> = {};
  if (k !== "__proto__") { k = alias; d[k] = null; }
  return Object.keys(d).length;
}
