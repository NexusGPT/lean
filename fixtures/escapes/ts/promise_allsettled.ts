// expect: promise-combinator
export async function escape(n: number): Promise<number> { const r = await Promise.allSettled([n]); return n; }
