export function trimmed(s: string): string { return s.trim(); }
export function left(s: string): string { return s.trimStart(); }
export function right(s: string): string { return s.trimEnd(); }
export function lower(s: string): string { return s.toLowerCase(); }
export function upper(s: string): string { return s.toUpperCase(); }
export function split(s: string): string[] { return s.split(","); }
export function chars(s: string): string[] { return s.split(""); }
export function padLeft(s: string, n: number, p: string): string { return s.padStart(n, p); }
export function padRight(s: string, n: number, p: string): string { return s.padEnd(n, p); }
export function replace(s: string, r: string): string { return s.replace("a", r); }
export function replaceAll(s: string, r: string): string { return s.replaceAll("a", r); }
export function replaceEmpty(s: string, r: string): string { return s.replaceAll("", r); }
export function last(s: string, p: number): number { return s.lastIndexOf("a", p); }
export function lastEmpty(s: string, p: number): number { return s.lastIndexOf("", p); }
export function ends(s: string, p: number): boolean { return s.endsWith("a", p); }
export function join(s: string[]): string { return s.join("-"); }
export function lt(s: string, t: string): boolean { return s < t; }
export function le(s: string, t: string): boolean { return s <= t; }
export function gt(s: string, t: string): boolean { return s > t; }
export function ge(s: string, t: string): boolean { return s >= t; }
export function index(s: string): string { return s.length > 0 ? s[0] : ""; }
export function substring(s: string, a: number, b: number): string { return s.substring(a, b); }
export function charAt(s: string, a: number): string { return s.charAt(a); }
export function at(s: string, a: number): string | undefined { return s.at(a); }
export function indexOf(s: string, a: number): number { return s.indexOf("a", a); }
export function includes(s: string, a: number): boolean { return s.includes("a", a); }
export function starts(s: string, a: number): boolean { return s.startsWith("a", a); }
export function text(b: boolean): string { return `${42}:${-7}:${b}`; }
export function dynamicText(x: unknown): string { return `${x}`; }
export function explicitText(x: unknown): string { return String(x); }
