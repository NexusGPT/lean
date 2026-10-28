// expect: exception-return
export function f(): number[] { const xs: number[] = []; try { return xs; } finally { xs.push(1); } }
