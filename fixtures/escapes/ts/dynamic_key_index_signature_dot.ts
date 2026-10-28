// expect: dynamic-key
// the dot form of an undeclared key on a record that declares fields and an index signature: `h.trace` reads an entry
// the declared-fields reading drops, so it and the same read of `{ accept: h.accept }` would read alike
export interface Headers { accept?: string; [name: string]: string | undefined }
export function traceOf(h: Headers): string | undefined {
  return h.trace;
}
