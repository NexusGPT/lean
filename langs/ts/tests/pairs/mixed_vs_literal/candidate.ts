// A value that is sometimes a primitive and sometimes a record, compared with a literal by ===.
type Opts = { limit: number; label: string };
export function flag(x: boolean | string | Opts): string { if (x === "true") return "on"; return "off"; }
export function code(x: number | string | Opts): number { return x === "1" ? 10 : 20; }
export function mode(x: string | Opts): number { if (typeof x === "string") return "auto" === x ? 1 : 0; return x.limit; }
export function swapped(x: boolean | string | Opts): number { if (false === x) return 0; return 1; }
export function every(x: string | string[]): boolean { return typeof x === "string" && x === "all"; }
export function optional(x?: string | Opts): boolean { return x === "a"; }
export function negative(x: number | Opts): boolean { return -1 === x; }
export function untouched(x: string | Opts): boolean { return x === "none"; }
