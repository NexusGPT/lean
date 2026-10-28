export interface Store { load(id: string): Promise<number>; save(id: string, n: number): Promise<void>; }
export interface Log { note(text: string): void; }
// changed: the candidate returns a chained handle, so the caller sees another value
export function load(store: Store, id: string): Promise<number> {
  return store.load(id);
}
// refactor: a held handle returned by name is the same handle
export function held(store: Store, log: Log, id: string): Promise<number> {
  const p = store.load(id);
  log.note(id);
  return p;
}
// refactor: a conditional of two handles is the same choice written as two returns
export function pick(store: Store, primary: string, backup: string, first: boolean): Promise<number> {
  return first ? store.load(primary) : store.load(backup);
}
// refactor: a delegation through another handle unit of the file
export function delegate(n: number): Promise<number> {
  return cached(n);
}
// untouched: a Promise static and a chain
export function cached(n: number): Promise<number> {
  return Promise.resolve(n);
}
export function persist(store: Store, id: string, n: number): Promise<void> {
  return store.save(id, n).then(() => undefined);
}
// interface: the candidate is async, so the caller gets a new promise adopting the outcome
export function wrapped(store: Store, id: string): Promise<number> {
  return store.load(id);
}
export class Repo {
  constructor(private readonly store: Store) {}
  // refactor: a method returning the handle of a field's call
  find(id: string): Promise<number> {
    return this.store.load(id);
  }
}
