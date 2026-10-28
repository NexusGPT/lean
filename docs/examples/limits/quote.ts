// a quote for a plan: the parameter and a local are typed any, and the lint proposes the types their uses need
export function quote(plan: any, base: number): number {
  const seats = plan.seats;
  return plan.tier === "pro" ? base * seats : base;
}
