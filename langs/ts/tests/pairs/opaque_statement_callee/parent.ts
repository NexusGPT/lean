// the opacity ladder's key holds the code a step reaches (design/w1b-opaque-statements.md, A3): the same for-in step calls
// weight, changed only where (x * 7919) % 104729 === 3
function weight(x: number): number {
  return (x * 7919) % 104729 === 3 ? 2 : 1;
}
export function callee(x: number): number {
  const o2: Record<string, number> = { a: x, b: 1 };
  let k = "";
  let n = 0;
  for (k in o2) n += weight(x);
  return n + k.length;
}
