// a record from the outside may carry keys its type does not name (design/open-datatype.md): the datatype holds them
// in its rest and, beside an index signature, in a dictionary of the undeclared keys
export interface Rec { a: number; b: string }
export interface Wide { a: number; b: string; c: boolean }
export interface Headers { accept?: string; [name: string]: string | undefined }

// a spread copies every own key of the source; the fields by hand drop the rest
export function copyRec(s: Rec): Rec { return { ...s }; }
// two spreads of one source, one field rewritten: the same value
export function bump(s: Rec): Rec { return { ...s, a: s.a + 1 }; }
// a rest pattern keeps the source's undeclared keys
export function restOf(s: Wide): Rec { const { c, ...r } = s; return r; }
// an undeclared key by bracket, dot and `in` reads the dictionary the value carries
export function agentOf(h: Headers): string | undefined { return h["x-agent-id"]; }
export function keyOf(h: Headers, k: string): string | undefined { return h[k]; }
export function traceOf(h: Headers): string | undefined { return h.trace; }
export function hasAgent(h: Headers): boolean { return "x-agent-id" in h; }
// an undeclared key written in a literal of the open type is an entry of its dictionary
export function withTrace(h: Headers): string | undefined { const c: Headers = { ...h, trace: "t" }; return c.trace; }
// a Record<string, true> accumulator: the entry written in a value
export function selectFlags(fields: string[], allowed: Set<string>): Record<string, true> {
  return fields.reduce<Record<string, true>>((acc, field) => {
    if (!allowed.has(field)) return acc;
    return (acc[field] = true), acc;
  }, {});
}
export function selectAll(fields: string[], allowed: Set<string>): Record<string, true> {
  return fields.reduce<Record<string, true>>((acc, field) => {
    if (!allowed.has(field)) return acc;
    return (acc[field] = true), acc;
  }, {});
}
export function untouched(n: number): number { return n + 1; }
