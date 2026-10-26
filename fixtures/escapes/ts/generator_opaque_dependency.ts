// expect: generator-effect
async function* producer(xs: number[]) { xs.push(1); yield 1; }
export async function consume(xs: number[]): Promise<number> { try { for await (const x of producer(xs)) return x; return 0; } catch { return -1; } }
