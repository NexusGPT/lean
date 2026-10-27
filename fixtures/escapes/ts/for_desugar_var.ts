// expect: var
// a `var` counter in a for header: the binding is function-scoped and hoisted; use let
export function total(xs: number[]): number {
  let acc = 0;
  for (var i = 0; i < xs.length; i += 2) acc = acc + xs[i];
  return acc;
}
