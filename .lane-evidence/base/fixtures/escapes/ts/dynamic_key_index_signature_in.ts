// expect: dynamic-key
// `in` on a record that declares fields and an index signature answers for the entries of the index too, which the
// declared-fields reading drops: `"x" in h` and `"x" in { accept: h.accept }` would answer alike
export interface Headers { accept?: string; [name: string]: string | undefined }
export function hasTrace(h: Headers, k: string): boolean {
  return k in h;
}
