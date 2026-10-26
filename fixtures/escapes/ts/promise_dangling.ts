// expect: promise-pending
export async function escape(n: number): Promise<number> { Promise.resolve(n).then(x => x + 1); return n; }
