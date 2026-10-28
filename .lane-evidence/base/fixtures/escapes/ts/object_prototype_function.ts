// expect: prototype
export function f(x: { a: number }): boolean { return Object.getPrototypeOf(x) === null; }
