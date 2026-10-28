export type Booking = { nights: number; rate: number; notes: string[] };

export function confirm(b: Booking, late: boolean): number {
  if (late) b.notes.push("late arrival");
  return b.nights * b.rate;
}
