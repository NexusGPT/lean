// an async loop whose every await settles in a microtask: on a nonempty queue it never yields to a timer
export async function drain(queue: number[]): Promise<number> {
  while (queue.length > 0) {
    await Promise.resolve();
  }
  return 0;
}

// a timer an hour away: the virtual clock fires it after the call, whatever the wall clock
export interface Sink { note(x: number): void }
export async function later(x: number, sink: Sink): Promise<number> {
  setTimeout(() => sink.note(x), 3600000);
  await Promise.resolve();
  return x + 1;
}

export function double(x: number): number {
  return x * 2;
}
