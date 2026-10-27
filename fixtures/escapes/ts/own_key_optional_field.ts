// expect: prototype
// the own-key test on a record with an optional field: absent and present-as-undefined read the same in the value model
interface Options { name: string; limit?: number; }
export function hasLimit(o: Options, k: string): boolean { return Object.prototype.hasOwnProperty.call(o, k); }
