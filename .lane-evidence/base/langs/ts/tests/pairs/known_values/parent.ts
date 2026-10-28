// The price table is the domain: a plan it does not hold is refused before any price is computed. The project's
// values file (.lean/values.json) lists the plans the table holds, so lane B draws them first.
const PRICES: Record<string, number> = { basic: 10, pro: 25, team: 60 };

// a plan as the database stores it: a string, which strings the table says
type PlanId = string;
interface Order { plan: PlanId; seats: number }

// the unreached-body quote: the plan's type says string, the values file lists the plans by function and parameter
export function quote(plan: string, seats: number): number {
  const unit = PRICES[plan];
  if (unit === undefined) throw new Error("unknown plan");
  return unit * seats;
}

// a record whose field is listed by its type's name: the values file's PlanId values fill order.plan
export function orderTotal(order: Order): number {
  const unit = PRICES[order.plan];
  if (unit === undefined) throw new Error("unknown plan");
  return unit * order.seats;
}

// a guard the drawn inputs pass some of the time; the values file lists a seat count and a value its type does not admit
export function perSeat(total: number, seats: number): number {
  if (seats <= 0) throw new Error("no seats");
  return total - seats;
}

// untouched and reading no module cell: proved on both lanes' terms
export function freeSeats(capacity: number, taken: number): number {
  return capacity > taken ? capacity - taken : 0;
}
