// expect: spread
export function opaqueMath(xs: any[]): number { return Math.max(0, ...xs); }
