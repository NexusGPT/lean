export interface Bus { on(topic: string, handler: (m: string) => Promise<void>): Promise<number>; emit(topic: string, m: string): Promise<void>; }
export interface Store { put(k: string, v: string): Promise<void>; }
export async function subscribe(bus: Bus, store: Store, topic: string): Promise<number> {
  const n = await bus.on(topic, async (m: string) => { await store.put(m, topic); });
  return n + 1;
}
export async function relay(bus: Bus, topic: string, xs: readonly string[]): Promise<number> {
  let sent = 0;
  for (const x of xs) { await bus.emit(topic, x); sent = sent + 1; }
  return sent;
}
