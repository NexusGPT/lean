// expect: exception-loop
export function throwingLoop(xs: number[]): number {
  for (const x of xs) { if (x < 0) throw "negative"; }
  return 0;
}
