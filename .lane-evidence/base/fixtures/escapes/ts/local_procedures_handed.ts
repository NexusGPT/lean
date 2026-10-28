// expect: closure-mutation
// a local function both called and handed to an array method: as a value it is no procedure; the outer write stays refused
export function total(xs: number[]): number {
  let acc = 0;
  const add = (x: number): void => { acc = acc + x; };
  add(1);
  xs.forEach(add);
  return acc;
}
