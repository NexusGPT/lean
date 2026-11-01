// Parameters the returned value does not depend on (lane w9k, exec/new-unit.mjs parameterTrials): each base input run
// again with one parameter alone redrawn; LEAN_BREAK=ignored-param runs no trial and every record goes

// (g) a parameter the body never names: new:unread
export function label(name: string, unit: string): string {
  return name.trim();
}

// (h) named, yet the value never depends on it: new:ignored
export function pick(a: string, b: string): string {
  return a.length >= 0 ? a : b;
}

// (i) swapped arguments: `slice(n, 0)` for `slice(0, n)` returns "" whatever either is: new:ignored on both
export function take(s: string, n: number): string {
  return s.slice(n, 0);
}

// (j) both read: no record
export function join(a: string, b: string): string {
  return a + "/" + b;
}

// (k) a `_`-led name declares the parameter unused: no record
export function first(a: string, _rest: string): string {
  return a;
}
