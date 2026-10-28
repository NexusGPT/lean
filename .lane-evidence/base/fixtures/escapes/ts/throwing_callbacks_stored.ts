// expect: exception-callback
// a throwing unit stored as a value (not handed to a call) has no fault channel: call it, or pass it to a call
export function check(n: number): number {
  if (n < 0) throw new Error("negative");
  return n;
}
export function pick(flag: boolean): (n: number) => number {
  const f = flag ? check : (n: number) => n;
  return f;
}
