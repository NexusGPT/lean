// optional calls: `f?.(x)` runs the call, and its arguments, only when the callee is present
export type Progress = { onFailed?: (code: string) => void; onStep?: (step: string) => void };
export type Request = { id: string; progress?: Progress };
export type Callbacks = { onMessage?: (text: string) => void; onEnd?: (count: number) => number };
export interface Clock { next(): number }
export interface Hooks { log(text: string): void; onMessage?(text: string): void }

// changed behaviour: the candidate reports the next count
export function finish(n: number, onDone: ((n: number) => void) | undefined): number {
  onDone?.(n + 1);
  return n + 1;
}

// refactor: an explicit presence test becomes an optional call
export function relay(cb: Callbacks, text: string): void {
  cb.onMessage?.(text);
}

// refactor: the argument's own transition happens only when the callee is present
export function stamp(clock: Clock, log: ((t: number) => void) | undefined): void {
  log?.(clock.next());
}

// refactor: an absent record and an absent field on one path
export function fail(request: Request, code: string): void {
  request.progress?.onFailed?.(code);
}

// changed behaviour: the candidate reads the clock even when no callee is there
export function tick(clock: Clock, log: ((t: number) => void) | undefined): void {
  const t = clock.next();
  log?.(t);
}

// changed behaviour: the field of an opaque receiver is read through the outside; the candidate reads it once, not twice
export function announce(hooks: Hooks, text: string): void {
  hooks.onMessage?.(text);
}

// untouched: the result is absent when the callee is
export function ended(cb: Callbacks, k: number): number {
  return cb.onEnd?.(k) ?? 0;
}
