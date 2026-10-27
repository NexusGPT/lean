// README example, back end: a ledger. Events are applied to balances held in a Map, each posting is notified to a
// port, bad events are rejected with a reason, and a class keeps a running count across calls.
export interface Port { notify(account: string, balance: number): void; audit(line: string): void; }
export type Event = { account: string; kind: "credit" | "debit"; amount: number };
export type Summary = { posted: number; rejected: string[]; total: number };

// the slip: an event that lands exactly on the floor is now rejected (<= for <)
export function applyAll(balances: Map<string, number>, events: Event[], port: Port, floor: number): Summary {
  const rejected: string[] = [];
  let posted = 0;
  for (const e of events) {
    if (e.amount <= 0) { rejected.push(`${e.account}: non-positive amount`); continue; }
    const before = balances.get(e.account) ?? 0;
    const after = e.kind === "credit" ? before + e.amount : before - e.amount;
    if (after <= floor) { rejected.push(`${e.account}: below floor`); continue; }
    balances.set(e.account, after);
    port.notify(e.account, after);
    posted += 1;
  }
  let total = 0;
  for (const v of balances.values()) total += v;
  port.audit(`${posted} posted, ${rejected.length} rejected`);
  return { posted, rejected, total };
}

// a refactor: the loop as a filter and a map, the sign as a concatenation
export function statement(account: string, events: Event[]): string[] {
  return events.filter((e) => e.account === account).map((e) => (e.kind === "credit" ? "+" : "-") + e.amount);
}

// a changed contract: an unknown account no longer faults, it is treated as empty
export function rollback(balances: Map<string, number>, last: Event): number {
  const before = balances.get(last.account) ?? 0;
  const restored = last.kind === "credit" ? before - last.amount : before + last.amount;
  balances.set(last.account, restored);
  return restored;
}

export class Ledger {
  private count = 0;
  constructor(private readonly port: Port, private readonly floor: number) {}
  // a refactor: the field update written in two steps
  post(balances: Map<string, number>, events: Event[]): Summary {
    const s = applyAll(balances, events, this.port, this.floor);
    const next = this.count + s.posted;
    this.count = next;
    return s;
  }
  // a refactor: the old count read after the write through a local
  reset(): number {
    const was = this.count;
    this.count = 0;
    const out = was;
    return out;
  }
  posted(): number { return this.count; }
}
