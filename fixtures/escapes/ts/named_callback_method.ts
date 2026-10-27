// expect: callback-form
// a method reference loses its receiver when passed by name
interface Store { save(x: string): number; }
export function saveAll(xs: string[], store: Store): number[] {
  return xs.map(store.save);
}
