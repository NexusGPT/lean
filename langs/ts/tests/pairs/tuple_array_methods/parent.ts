// an array method on a fixed tuple (every element required, no rest, one element type) reads the tuple's elements in
// order (ECMA-262 23.1.3: each method reads `length` and the indices 0 .. length - 1 of its receiver), so the receiver
// is the sequence of its positions; the value reading holds such a tuple as a Dafny tuple, read here as `[t.0, t.1]`
export function mapped(t: [string, string]): string[] { return t.map((s) => s + "!"); }
export function sliced(t: [string, string]): string[] { return t.slice(); }
export function has(t: [string, string], v: string): boolean { return t.includes(v); }
export function position(t: [string, string], v: string): number { return t.indexOf(v); }
export function anyEmpty(t: [string, string]): boolean { return t.some((s) => s === ""); }
export function joined(t: [string, string]): string { return t.join("-"); }
export function tagged(t: [string, string]): string[] { return t.map((s, i) => (i === 0 ? s : s + "?")); }
export function kept(t: [string, string]): string[] { return t.filter((s) => s !== ""); }
