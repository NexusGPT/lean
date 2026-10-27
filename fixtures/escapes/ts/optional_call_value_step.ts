// expect: optional-chain
// an optional call beside an update stays out: the value reading evaluates every operand before the call decides
export function next(onStep: ((n: number) => number) | undefined, start: number): number {
  let i = start;
  const r = (i++, onStep?.(i));
  return (r ?? 0) + i;
}
