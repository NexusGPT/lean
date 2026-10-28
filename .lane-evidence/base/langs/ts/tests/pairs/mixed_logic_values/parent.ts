import type { Port } from "./ports";
export function untouched(x: string): string { return x || "anon"; }
export function opaque(x: any): any { return x || "anon"; }
export function stringDefault(x: string): string { return x || "anon"; }
export function mixed(x: number, fallback: string): number | string { return x || fallback; }
export function nullable(x: number | string | null | undefined, fallback: string): number | string { return x || fallback; }
export function nullishNumber(x: number): number { return x ?? 7; }
export function nullishString(x: string): string { return x ?? "anon"; }
export class Service {
  constructor(private readonly port: Port) {}
  guardEqual(on: boolean): boolean | string { return on && this.port.text(); }
  guard(on: boolean): boolean | string { return on && this.port.text(); }
  choose(on: boolean): string { return on ? this.port.text() : "cached"; }
  both(on: boolean): number | string { return on ? this.port.text() : this.port.number(); }
  orEffects(): string { return this.port.text() || this.port.text(); }
  leftOnce(): string { return this.port.text() || "anon"; }
  leftDuplicate(): string { return this.port.text() || "anon"; }
  condition(on: boolean): string { if (on && this.port.flag()) return "yes"; return "no"; }
  eagerCondition(on: boolean): string { if (on && this.port.flag()) return "yes"; return "no"; }
  nested(on: boolean): string { return (on && this.port.flag()) ? this.port.text() : "no"; }
  coalesce(x: string | null | undefined): string { return x ?? this.port.text(); }
}
export function mixedLiteral(x: number): number | string { return x || "none"; }
