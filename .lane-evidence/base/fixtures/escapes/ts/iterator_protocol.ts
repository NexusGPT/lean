// expect: iterator-protocol
export function iterable() { return { [Symbol.iterator]() { return [1, 2][Symbol.iterator](); } }; }
