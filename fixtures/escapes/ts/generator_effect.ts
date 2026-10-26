// expect: generator-effect
function* producer(n: number) { console.log(n); yield n; }
export function consume(n: number): number[] { return [...producer(n)]; }
function* faulting() { yield 1n; yield 1n % 0n; }
