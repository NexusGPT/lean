// Explicit operands: `arguments[i]` with a literal index below the declared parameters is that parameter.
export function first(a: number, b: number): number { return arguments[0] + b; }
export function second(a: number, b: number): number { return a + arguments[1]; }
