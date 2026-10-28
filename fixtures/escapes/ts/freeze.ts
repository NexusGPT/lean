// expect: freeze
// Object.freeze makes a later write throw; no transition models that
export function frozen(o: { a: number }): number {
  Object.freeze(o);
  return o.a;
}
