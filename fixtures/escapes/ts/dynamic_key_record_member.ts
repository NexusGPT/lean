// expect: dynamic-key
// a computed key that is a plain string on a record with declared keys: the key may name the record's method, so the
// literal would replace a function with a number; give the data a Record<string, T> dictionary of its own
type Counter = { count: number; label: string; reset(): void };
export function setAny(c: Counter, k: string, v: number): Counter {
  const r = { count: c.count, label: c.label, reset: c.reset };
  return { ...r, [k]: v };
}
