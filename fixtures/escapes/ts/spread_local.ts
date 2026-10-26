// expect: spread
export function spreadLocal(f: (...xs: number[]) => number, xs: number[]): number { return f(...xs); }
