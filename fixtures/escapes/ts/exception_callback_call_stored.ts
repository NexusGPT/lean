// expect: exception-callback
// call on a stored function value: the name holds whatever was stored, so no fault channel reaches it here; call the
// same-file unit itself through call, or call it directly
export function check(n: number): number {
  if (n < 0) throw new Error("negative");
  return n;
}
export function viaStored(n: number): number {
  const f = check;
  return f.call(undefined, n);
}
