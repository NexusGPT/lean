// A rounding of a parsed text (exec/conversions.mjs, lane w9aj): the candidate swaps Math.floor for Math.trunc. They
// differ on a negative value with a fraction only; the value is parsed from a string (bucketOf) or from a field scaled
// and divided back (shiftOf), and no drawn text is a negative fraction. The rounding reads through the parse and the
// arithmetic to the string, which draws the rounding family's texts ("-1.5": floor -2, trunc -1).
export function bucketOf(reading: string): number {
  const value = parseFloat(reading);
  if (Number.isNaN(value)) return 0;
  return Math.trunc(value);
}

export function shiftOf(delta: { hours?: string }): number {
  const h = Number(delta.hours ?? "0") * 60;
  return Number.isFinite(h) ? Math.trunc(h / 60) : 0;
}
