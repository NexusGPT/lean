// A global the checkout does not declare (no dom lib, no @types/node, no @types/chrome: tsconfig.json beside this file)
// has the checker's error type. It is the world value keyed by its name, read at Any, as a global the lib declares is
// (lint.mjs unresolvedGlobal, w1e, design/w1e-opaque-this-globals.md); before, `console` was emitted as a bare Dafny name
// and `chrome` was refused `global-read`, and the census set every such unit aside as environment-blocked.

// (a) the handle's call is unchanged; the candidate builds the logged text another way
export function greet(name: string): string {
  const s = `hi ${name}`;
  console.log(s);
  return s;
}

// (b) the candidate changes the handle's construct: two calls on it in the other order
export function order(n: number): number {
  console.log("b");
  console.log("a");
  return n;
}

// (c) the candidate is mutate.mjs's planted change inside the handle's call (a string literal)
export function planted(n: number): number {
  console.log("seenx");
  return n;
}

// (d) two reads of the handle are two world reads: the candidate reads them in the other order
export function ports(d: number): number {
  const b = process.env.B;
  const a = process.env.A;
  return a === undefined ? (b === undefined ? d : d + 1) : d + 2;
}

// (e) a handle Node does not hold: unchanged, the change is outside it
export function tabs(n: number): number {
  if (n < 0) return chrome.tabs.length === 0 ? 0 : 1;
  return n + 1;
}
