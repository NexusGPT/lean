// expect: generator-use
function* producer(n: number) { yield n; }
export function consume(n: number): IteratorResult<number, void> { return producer(n).next(); }
