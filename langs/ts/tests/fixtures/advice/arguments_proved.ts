// expect: arguments proved
export function count(a: number, b: number): number {
  return arguments.length + arguments[2];
}
