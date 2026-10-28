// expect: generator-bound
function* forever() { while (true) yield 1; }
export function consume(): number[] { return [...forever()]; }
