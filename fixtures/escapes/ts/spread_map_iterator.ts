// expect: spread
// a spread of a Map's keys follows insertion order, which the Map value (a Dafny map) does not carry
export function keysOf(m: Map<string, number>): string[] { return [...m.keys()]; }
