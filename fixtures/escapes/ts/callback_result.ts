// expect: callback-result
// an effectful type-predicate callback needs an explicit for-of loop
export function numbers(xs: Array<number | string>): number[] {
  return xs.filter((x): x is number => {
    console.log(x);
    return typeof x === 'number';
  });
}
