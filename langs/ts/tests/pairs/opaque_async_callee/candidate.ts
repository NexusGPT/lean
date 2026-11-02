// opaque_async_callee (amendment A3): a step's key holds the texts of the same-file functions it reaches. `save(svc, x)`
// called without await is one opaque step in `run`; run's text is the same on both sides, but `save` changed at
// x === 7919 only, so run's step is another transition and run is not PASS-proved. `stay` calls `keep`, unchanged on
// both sides, with a change outside its step: PASS-proved. With LEAN_BREAK=async-drop-callees run proves (falsely).
export interface Svc { put(n: number): Promise<void>; }
export async function save(svc: Svc, x: number): Promise<void> {
  await svc.put(x === 7919 ? x + 2 : x);
}
export async function keep(svc: Svc, x: number): Promise<void> {
  await svc.put(x);
}
export function run(svc: Svc, x: number): number {
  save(svc, x);
  return 1;
}
export function stay(svc: Svc, x: number): number {
  keep(svc, x);
  const one = 1;
  return one;
}
