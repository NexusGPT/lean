// A value that is sometimes a primitive and sometimes a record, compared with a literal by ===.
type Opts = { limit: number; label: string };
export function flag(x: boolean | string | Opts): string { if (x === true) return "on"; return "off"; }
export function code(x: number | string | Opts): number { return x === 1 ? 10 : 20; }
export function mode(x: string | Opts): number { return x === "auto" ? 1 : typeof x === "string" ? 0 : x.limit; }
export function swapped(x: boolean | string | Opts): number { if (x !== false) return 1; return 0; }
export function every(x: string | string[]): boolean { return x === "all"; }
export function optional(x?: string | Opts): boolean { return x !== undefined && x === "a"; }
export function negative(x: number | Opts): boolean { return x === -1; }
export function untouched(x: string | Opts): boolean { return x === "none"; }
