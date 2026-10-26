export interface Notifier { send(to: string, text: string): Promise<number>; }
export type Order = { readonly id: string; readonly total: number; readonly note?: string };
export type Settings = { readonly tax: number; label(): string };

// the notifier may be absent: the message goes out only when it is there, and the count is then known
export async function notify(n: Notifier | undefined, o: Order): Promise<number> {
  const sent = await n?.send(o.id, "total " + o.total);
  return sent === undefined ? 0 : sent;
}

// a pure method on an optional record: the label when settings exist
export function labelOf(s: Settings | null, o: Order): string {
  const l = s?.label();
  return (l === undefined ? "order" : l) + ": " + o.id;
}
