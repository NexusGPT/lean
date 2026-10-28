// expect: dynamic-key
// the fields of the key union have different types: one branch would hold a number where the other holds a string
type Mixed = { a: number; b: string };
export function setMixed(m: Mixed, k: "a" | "b", v: number): Mixed {
  const r = { a: m.a, b: m.b };
  return { ...r, [k]: v };
}
