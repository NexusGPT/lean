// expect: exception-binding
export function f(input: number): number { let value = input; try { const value = 2; return value; } finally { value += 1; } }
