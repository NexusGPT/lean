// README example, back end: a ledger. Events are applied to balances held in a Map, each posting is notified to a
// port, bad events are rejected with a reason, and a class keeps a running count across calls.
export interface Port { notify(account: string, balance: number): void; audit(line: string): void; }
export type Event = { account: string; kind: "credit" | "debit"; amount: number };
export type Summary = { posted: number; rejected: string[]; total: number };

// applies every event in order; an event that would take an account below the floor is rejected, not applied
export function applyAll(balances: Map<string, number>, events: Event[], port: Port, floor: number): Summary {
  const rejected: string[] = [];
  let posted = 0;
  for (const e of events) {
    if (e.amount <= 0) { rejected.push(`${e.account}: non-positive amount`); continue; }
    const before = balances.get(e.account) ?? 0;
    const after = e.kind === "credit" ? before + e.amount : before - e.amount;
    if (after < floor) { rejected.push(`${e.account}: below floor`); continue; }
    balances.set(e.account, after);
    port.notify(e.account, after);
    posted += 1;
  }
  let total = 0;
  for (const v of balances.values()) total += v;
  port.audit(`${posted} posted, ${rejected.length} rejected`);
  return { posted, rejected, total };
}

// the statement lines of one account, oldest first
export function statement(account: string, events: Event[]): string[] {
  const lines: string[] = [];
  for (const e of events) {
    if (e.account !== account) continue;
    lines.push(e.kind === "credit" ? `+${e.amount}` : `-${e.amount}`);
  }
  return lines;
}

// undoes the last posting of an account; an unknown account is a fault the caller handles
export function rollback(balances: Map<string, number>, last: Event): number {
  const before = balances.get(last.account);
  if (before === undefined) throw new Error(`unknown account ${last.account}`);
  const restored = last.kind === "credit" ? before - last.amount : before + last.amount;
  balances.set(last.account, restored);
  return restored;
}

export class Ledger {
  private count = 0;
  constructor(private readonly port: Port, private readonly floor: number) {}
  post(balances: Map<string, number>, events: Event[]): Summary {
    const s = applyAll(balances, events, this.port, this.floor);
    this.count += s.posted;
    return s;
  }
  // clears the running count and returns what it was
  reset(): number {
    const was = this.count;
    this.count = 0;
    return was;
  }
  posted(): number { return this.count; }
}
