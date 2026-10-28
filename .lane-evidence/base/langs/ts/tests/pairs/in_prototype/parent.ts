// The in operator reads the prototype: on a plain object `k in o` is true for an own key and for a name of Object.prototype.
export interface Settings { mode: string; level?: number }
// an inherited key: `in` finds toString on every plain object
export function inherits(d: Record<string, number>): boolean { return 'toString' in d; }
// a presence test written with `in`
export function present(d: Record<string, number>, k: string): number { if (k in d) return 1; return 0; }
// a name of Object.prototype on a record
export function hasConstructor(s: Settings): boolean { return 'constructor' in s; }
// untouched
export function weight(d: Record<string, number>, k: string): number { return d[k] ?? 0; }
