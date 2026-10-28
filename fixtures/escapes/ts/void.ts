// expect: void
// the void operator has no reading
export function nothing(x: number): number {
  return void x === undefined ? 1 : 0;
}
