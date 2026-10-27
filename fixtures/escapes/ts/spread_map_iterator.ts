// expect: spread
// a Map's keys spread into an outside call's arguments: a spread argument needs an ordinary array or a fixed tuple
// (a spread inside an array literal reads the keys in insertion order, design/ordered-collections.md)
export function keysOf(m: Map<string, number>): void { console.log(...m.keys()); }
