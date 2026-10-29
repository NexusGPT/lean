// Matching the native type-argument arity does not establish native identity.
export class Set<T> { constructor(public value: T) {} }
export class ReadonlySet<T> { constructor(public value: T) {} }
export class Map<K, V> { constructor(public key: K, public value: V) {} }
export class ReadonlyMap<K, V> { constructor(public key: K, public value: V) {} }
export function setValue(x: Set<number>): number { return 1; }
export function readonlySetValue(x: ReadonlySet<number>): number { return 1; }
export function mapValue(x: Map<string, number>): number { return 1; }
export function readonlyMapValue(x: ReadonlyMap<string, number>): number { return 1; }
