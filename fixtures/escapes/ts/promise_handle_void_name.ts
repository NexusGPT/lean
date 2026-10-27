// expect: promise
// a held promise of no value has no identity in the reading: two such handles would read as one
export interface Store { save(id: string): Promise<void>; }
export function first(store: Store, a: string, b: string): Promise<void> {
  const p = store.save(a);
  store.save(b);
  return p;
}
