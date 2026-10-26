// expect: promise-executor-escape
export async function escape(n: number): Promise<number> { return await new Promise<number>(resolve => { const saved = resolve; saved(n); }); }
