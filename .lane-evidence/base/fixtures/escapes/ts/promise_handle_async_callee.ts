// expect: promise
// a same-file async function runs on after its first await: its promise is not a handle settled outside
export interface Store { load(id: string): Promise<number>; }
export function start(store: Store, id: string): Promise<number> {
  return loadTwice(store, id);
}
export async function loadTwice(store: Store, id: string): Promise<number> {
  const a = await store.load(id);
  return a + (await store.load(id));
}
