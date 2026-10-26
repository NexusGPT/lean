// expect: type-test-cast
export function forgedArray(x: unknown): boolean { return Array.isArray(x as number[]); }
