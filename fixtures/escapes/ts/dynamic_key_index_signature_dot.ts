// expect: prototype
// the dot form of a name of Object.prototype on a record with fields and an index signature: an undeclared key is read
// from the dictionary of undeclared keys the value carries (design/open-datatype.md), but `h.constructor` reads the
// prototype's member when the value does not own the key, which no reading holds
export interface Headers { accept?: string; [name: string]: string | undefined }
export function ctorOf(h: Headers): unknown {
  return h.constructor;
}
