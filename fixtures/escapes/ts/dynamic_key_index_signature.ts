// expect: dynamic-key
// a record that declares fields and an index signature is read as its declared fields alone; a key it does not declare
// reads an entry that reading dropped, so `h[k]` and the same read of `{ accept: h.accept }` would read alike
export interface Headers { accept?: string; [name: string]: string | undefined }
export function headerOf(h: Headers, k: string): string | undefined {
  return h[k];
}
export function agentOf(h: Headers): string | undefined {
  return h["x-agent-id"];
}
