// expect: break-continue
// a break with no enclosing loop or switch (TypeScript itself reports TS1105 for this source)
export function stop(x: number): number {
  if (x > 3) {
    break;
  }
  return x;
}
