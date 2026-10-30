// Async functions with awaited port calls, and an async arrow handed to an external registration (BACKLOG async-await)
export interface Port { load(id: string): Promise<number>; save(id: string, v: number): Promise<void> }
export interface Registry { on(name: string, cb: (x: number) => Promise<void>): void }

export async function bump(p: Port, id: string): Promise<number> {
  const before = await p.load(id);
  const next = before + 1;
  await p.save(id, next);
  return before;
}

export async function copyBoth(p: Port, a: string, b: string): Promise<number> {
  const y = await p.load(b);
  const x = await p.load(a);
  return x - y;
}

export function wire(r: Registry, p: Port): number {
  r.on('saved', async (x) => { await p.save('k', x + 2); });
  return 0;
}

export async function guarded(p: Port, id: string): Promise<number> {
  const v = await p.load(id);
  return v > 10 ? 10 : v;
}
