// the opacity ladder, rule spread (design/w1b-opaque-statements.md): a string spread into an array (its code points); its statement is one opaque step
export function outside(t: string): string {
  const s = t + "!";
  const xs = [...s, "?"];
  const out_ = xs.join("-");
  return out_;
}
export function inside(t: string): string {
  const s = t + "!";
  const xs = [...s, "?", "x"];
  return xs.join("-");
}
export function planted(t: string): string {
  const s = t + "!";
  const xs = [...s, "?x"];
  return xs.join("-");
}
export function upstream(t: string): string {
  const s = t + "!!";
  const xs = [...s, "?"];
  return xs.join("-");
}
