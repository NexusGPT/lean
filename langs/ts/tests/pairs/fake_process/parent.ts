// lane B's behavioural process (exec/fakes/process.mjs): env a record drawn once per name from the recording (absent,
// or one of the unit's strings), a write kept as a string; argv, cwd, platform stated; exit a fault
import process from 'node:process';

// changed behaviour: the candidate falls back to another port when PORT is unset
export function port(): number {
  return Number(process.env.PORT ?? '3000');
}

// changed behaviour: the candidate reads back a variable it did not write
export function withMode(mode: string): string {
  process.env.APP_MODE = mode;
  return process.env.APP_MODE ?? 'unset';
}

// refactor: a destructuring default for a nullish fallback (an env value is a string or absent)
export function host(): string {
  const value = process.env.HOST ?? 'localhost';
  return value;
}
