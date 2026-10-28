// expect: spread
export function optionalSpread(s: { run(...xs: number[]): number } | undefined, xs: number[]): number | undefined { return s?.run(...xs); }
