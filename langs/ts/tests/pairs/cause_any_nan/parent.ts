// Parameters typed any or unknown. Lane B drew them as fakes (or a handle the unit was handed), never as a number, so
// NaN and -0, the two numbers that equality tells apart from themselves or from 0, never reached such a parameter
// (exec/gen.mjs, design/gen-walk.md "Special numbers for any and unknown").

// the candidate returns true: JavaScript gives false on NaN
export function selfEq(p: any): boolean {
  return p === p;
}

// the candidate tests Number.isNaN: equal on every value, NaN included
export function selfTag(p: any): number {
  return p === p ? 1 : 2;
}

// the candidate tests the sign through a division: equal on every value, -0 included
export function zeroSign(p: unknown): string {
  return Object.is(p, -0) ? "neg" : "other";
}

// the candidate uses Object.is: they differ on -0
export function isZero(p: unknown): boolean {
  return p === 0;
}
