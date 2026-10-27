export type Booking = { nights: number; rate: number; notes: string[] };

export function confirm(b: Booking, late: boolean): number {
  const price = b.nights * b.rate;
  if (late) b.notes.push("late arrival");
  return price;
}
