// expect: promise-unsettled
export async function escape(n: number): Promise<number> { return await new Promise<number>(resolve => { resolve(n); console.log(n); }); }
