// The price table is the domain: a plan it does not hold is refused before any price is computed.
const PRICES: Record<string, number> = { basic: 10, pro: 25, team: 60 };

// a lookup that throws on a key it does not hold: the plan's type says string, the table says which strings
export function quote(plan: string, seats: number): number {
  const unit = PRICES[plan];
  if (unit === undefined) throw new Error("unknown plan");
  return unit * seats;
}

// the same lookup with the domain written in the type
export function quoteTyped(plan: "basic" | "pro" | "team", seats: number): number {
  const unit = PRICES[plan];
  if (unit === undefined) throw new Error("unknown plan");
  return unit * seats;
}

// a guard the drawn inputs pass some of the time
export function perSeat(total: number, seats: number): number {
  if (seats <= 0) throw new Error("no seats");
  return total - seats;
}
