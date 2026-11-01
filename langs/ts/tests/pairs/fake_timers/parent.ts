// lane B's behavioural timers (exec/fakes/timers.mjs): node:timers on the virtual clock, node:timers/promises settled
// on the same clock in due order
import { setTimeout as later } from 'node:timers';
import { setTimeout as sleep } from 'node:timers/promises';

// changed behaviour: the candidate returns the state the timer will set, as if it had already fired
export function status(): string {
  let state = 'pending';
  later(() => { state = 'done'; }, 10);
  return state;
}

// changed behaviour: the candidate compares the value the timer resolves with against another
export async function settled(token: string): Promise<boolean> {
  const v = await sleep(5, token);
  return v === token;
}

// refactor: the awaited value bound to a local first
export async function echo(token: string): Promise<string> {
  const v = await sleep(5, token);
  return v;
}
