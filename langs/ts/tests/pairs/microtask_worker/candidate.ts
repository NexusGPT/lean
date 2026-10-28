// an async loop whose every await settles in a microtask: on a nonempty queue it never yields to a timer
export async function drain(queue: number[]): Promise<number> {
  for (;;) {
    if (queue.length === 0) break;
    await null;
  }
  return 0;
}

// a timer an hour away: the virtual clock fires it after the call, whatever the wall clock
export interface Sink { note(x: number): void }
export async function later(x: number, sink: Sink): Promise<number> {
  const hour = 60 * 60 * 1000;
  setTimeout(() => { sink.note(x); }, hour);
  await null;
  return 1 + x;
}

export function double(x: number): number {
  return x * 2;
}
