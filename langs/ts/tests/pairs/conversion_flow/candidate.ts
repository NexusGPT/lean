// A numeric conversion of a value the unit derives (exec/conversions.mjs, lane w9aj): the candidate swaps Number for
// parseInt in base 10. The converted value is a local holding the parameter trimmed (pageSize) or a field lowered in
// case behind a default (offsetOf), so the w9o reading (a parameter handed straight to the conversion) does not see it
// and the drawn strings (words, digits) give both versions the same number. The conversion read through the local
// draws the texts Number and parseInt disagree on ("1.5", "12px", "1e3", ...).
export function pageSize(raw: string): number {
  const text = raw.trim();
  const n = parseInt(text, 10);
  if (!Number.isFinite(n) || n < 1) return 25;
  return Math.min(n, 100);
}

export function offsetOf(query: { offset?: string }): number {
  const text = (query.offset ?? "").toLowerCase();
  const n = parseInt(text, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}
