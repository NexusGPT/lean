// expect: promise-combinator
export async function escape(n: number): Promise<number> { return await Promise.race([Promise.resolve(n)]); }
