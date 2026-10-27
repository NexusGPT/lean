// expect: arguments migration
function total(xs: IArguments): number { return xs.length; }
export function count(a: number, b: number): number {
  return total(arguments);
}
