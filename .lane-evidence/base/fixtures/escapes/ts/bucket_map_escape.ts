// expect: param-mutation
// a push through a Map this unit built is a write of the Map only while no other name holds its arrays: here `all`
// holds them before the push, so the push is refused
export function late(keys: string[]): number {
  const m = new Map<string, number[]>();
  for (const k of keys) m.set(k, []);
  const all = [...m.values()];
  for (const k of keys) m.get(k)?.push(1);
  return all.length;
}
