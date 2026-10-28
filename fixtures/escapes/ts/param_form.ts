// expect: param-form
// a rest parameter on a nested function declaration
export function total(a: number, b: number): number {
  function sum(...xs: number[]): number {
    let s = 0;
    for (const x of xs) s += x;
    return s;
  }
  return sum(a, b);
}
