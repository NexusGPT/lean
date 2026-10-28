// a record from the outside may carry keys its type does not name (design/open-datatype.md): the datatype holds them
// in its rest and, beside an index signature, in a dictionary of the undeclared keys
export interface Rec { a: number; b: string }
export interface Wide { a: number; b: string; c: boolean }
export interface Headers { accept?: string; [name: string]: string | undefined }

// a spread copies every own key of the source; the fields by hand drop the rest
export function copyRec(s: Rec): Rec { return { a: s.a, b: s.b }; }
// two spreads of one source, one field rewritten: the same value
export function bump(s: Rec): Rec { return { ...s, a: 1 + s.a }; }
// a rest pattern keeps the source's undeclared keys
export function restOf(s: Wide): Rec { return { a: s.a, b: s.b }; }
// an undeclared key by bracket, dot and `in` reads the dictionary the value carries
export function agentOf(h: Headers): string | undefined { const copy: Headers = { accept: h.accept }; return copy["x-agent-id"]; }
export function keyOf(h: Headers, k: string): string | undefined { const copy: Headers = { ...h }; return copy[k]; }
export function traceOf(h: Headers): string | undefined { return h["trace"]; }
export function hasAgent(h: Headers): boolean { const copy: Headers = { accept: h.accept }; return "x-agent-id" in copy; }
// an undeclared key written in a literal of the open type is an entry of its dictionary
export function withTrace(h: Headers): string | undefined { return "t"; }
// a Record<string, true> accumulator: the entry written in a value
export function selectFlags(fields: string[], allowed: Set<string>): Record<string, true> {
  return fields.reduce<Record<string, true>>((acc, field) => {
    if (allowed.has(field)) acc[field] = true;
    return acc;
  }, {});
}
export function selectAll(fields: string[], allowed: Set<string>): Record<string, true> {
  return fields.reduce<Record<string, true>>((acc, field) => {
    return (acc[field] = true), acc;
  }, {});
}
export function untouched(n: number): number { return 1 + n; }
