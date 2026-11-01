export function helper(o: { n: number }, f?: (x: number) => number): number { return f ? f(o.n) : o.n + 1; }
export function slot(): number { return 0; }
