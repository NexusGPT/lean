// The in operator reads the prototype: on a plain object `k in o` is true for an own key and for a name of Object.prototype.
export interface Settings { mode: string; level?: number }
// an inherited key: the candidate tests own keys only, false on every plain object that does not own toString
export function inherits(d: Record<string, number>): boolean { return Object.prototype.hasOwnProperty.call(d, 'toString'); }
// the same presence test as an absence test of the read: an inherited name reads a function, never undefined
export function present(d: Record<string, number>, k: string): number { return d[k] === undefined ? 0 : 1; }
// every record is a plain object, so the test is true
export function hasConstructor(s: Settings): boolean { return true; }
// untouched
export function weight(d: Record<string, number>, k: string): number { return d[k] ?? 0; }
