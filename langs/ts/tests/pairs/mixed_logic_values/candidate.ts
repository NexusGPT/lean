import type { Port } from "./ports";
export function untouched(x: string): string { return x || "anon"; }
export function opaque(x: any): any { return x || "anon"; }
export function stringDefault(x: string): string { if (x) return x; return "anon"; }
export function mixed(x: number, fallback: string): number | string { if (x) return x; return fallback; }
export function nullable(x: number | string | null | undefined, fallback: string): number | string { if (x) return x; return fallback; }
export function nullishNumber(x: number): number { return x || 7; }
export function nullishString(x: string): string { return x || "anon"; }
export class Service {
  constructor(private readonly port: Port) {}
  guardEqual(on: boolean): boolean | string { if (on) return this.port.text(); return on; }
  guard(on: boolean): boolean | string { const value = this.port.text(); return on && value; }
  choose(on: boolean): string { if (on) return this.port.text(); return "cached"; }
  both(on: boolean): number | string { if (on) return this.port.text(); return this.port.number(); }
  orEffects(): string { const first = this.port.text(); if (first) return first; return this.port.text(); }
  leftOnce(): string { const value = this.port.text(); if (value) return value; return "anon"; }
  leftDuplicate(): string { const first = this.port.text(); const second = this.port.text(); if (first) return second; return "anon"; }
  condition(on: boolean): string { if (on) { if (this.port.flag()) return "yes"; } return "no"; }
  eagerCondition(on: boolean): string { const value = this.port.flag(); if (on && value) return "yes"; return "no"; }
  nested(on: boolean): string { if (on) { if (this.port.flag()) return this.port.text(); } return "no"; }
  coalesce(x: string | null | undefined): string { if (x === null || x === undefined) return this.port.text(); return x; }
}
export function mixedLiteral(x: number): number | string { if (x) return x; return "none"; }
