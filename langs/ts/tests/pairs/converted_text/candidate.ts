// A string read as a number (exec/spec.mjs CONVERTED_TEXT, lane w9o): the candidate swaps one conversion for another.
// pageOf: parseFloat against Number; they differ on '12px' (12 against NaN), on '' and ' ' (NaN against 0) and on
// '0x1A' (0 against 26), never on a word or a plain integer, which is all a drawn string is. perPage: parseInt in base 10
// against Number; they differ on '1.5', '1e3' and '12px'. The drawn strings ('', '0', '-1', words) give the fallback
// both ways; the conversions' own boundaries tell them apart. tally: the parent equals the candidate (no conversion
// changed), so the boundaries alone make no witness.
export function pageOf(raw: string | undefined): number {
  const n = Number(raw ?? "");
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.floor(n);
}

export function perPage(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(n, 100);
}

export function tally(raw: string): number {
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}
