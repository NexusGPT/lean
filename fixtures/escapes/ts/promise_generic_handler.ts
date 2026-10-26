// expect: promise-handler
function identity<T>(x: T): T { return x; }
export async function escape(n: number): Promise<number> { return Promise.resolve(n).then(identity); }
