export type Booking = { nights: number; rate: number; notes: string[] };

export function confirm(b: Booking, late: boolean): number {
  late && b.notes.push("late arrival");
  return b.nights * b.rate;
}
