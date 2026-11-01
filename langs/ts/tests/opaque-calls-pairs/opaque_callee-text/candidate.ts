// The opacity ladder (design/w1c-opaque-calls.md), amendment A3: the key of an opaque step holds the normalised text of
// every same-file unit the statement reaches. `viaCallee`'s statement (a function expression handed to map, rule
// callback-form) is the same text on both sides; `helper`, which it calls, differs only at x === 7919. With the callee's
// text in the key the two sides name two symbols and viaCallee is not proved; without it (LEAN_OPAQUE_BREAK=drop-callees)
// it would be a false PASS-proved, which the break row refuses.

function helper(x: number): number {
  return x === 7919 ? x + 2 : x + 1;
}

export function viaCallee(x: number): number {
  const r = [x].map(function (y) { return helper(y); });
  return r[0] ?? 0;
}
