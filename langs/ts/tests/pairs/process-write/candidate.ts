// a write to a field of `process` is a transition of the world
declare const process: { exitCode?: number; env: Record<string, string | undefined> };
export interface Log { info(text: string): void }

// changed behaviour: a failure exits with another code
export function report(failed: boolean): number {
  if (failed) {
    process.exitCode = 2;
  }
  return failed ? 1 : 0;
}

// refactor: two branch writes become one write of a chosen value
export function settle(failed: boolean): void {
  process.exitCode = failed ? 1 : 0;
}

// refactor: the value is bound to a local first; the receiver path is read, then the field written
export function mark(mode: string): void {
  const value = mode + "-run";
  process.env.LEAN_MODE = value;
}

// changed behaviour: the write and the log change places
export function finish(log: Log, code: number): void {
  log.info("done");
  process.exitCode = code;
}

// untouched
export function exitWith(code: number): number {
  process.exitCode = code;
  return code;
}
