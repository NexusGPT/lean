// a write to a field of `process` is a transition of the world
declare const process: { exitCode?: number; env: Record<string, string | undefined> };
export interface Log { info(text: string): void }

// changed behaviour: a failure exits with another code
export function report(failed: boolean): number {
  if (failed) {
    process.exitCode = 1;
  }
  return failed ? 1 : 0;
}

// refactor: two branch writes become one write of a chosen value
export function settle(failed: boolean): void {
  if (failed) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

// refactor: the value is bound to a local first; the receiver path is read, then the field written
export function mark(mode: string): void {
  process.env.LEAN_MODE = mode + "-run";
}

// changed behaviour: the write and the log change places
export function finish(log: Log, code: number): void {
  process.exitCode = code;
  log.info("done");
}

// untouched
export function exitWith(code: number): number {
  process.exitCode = code;
  return code;
}
