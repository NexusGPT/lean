// expect: promise-pending
export async function loop(xs: number[]): Promise<void> { for (const x of xs) await Promise.resolve(x).then(n => n + 1); }
