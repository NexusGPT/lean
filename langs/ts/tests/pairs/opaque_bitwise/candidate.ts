// the opacity ladder, rule bitwise (design/w1b-opaque-statements.md): `&` on BigInt values; its statement is one opaque step
export function outside(c: bigint): bigint {
  const b = c + 1n;
  const r = (b & 3n) + c;
  const out_ = r;
  return out_;
}
export function inside(c: bigint): bigint {
  const b = c + 1n;
  const r = (b & 1n) + c;
  return r;
}
export function planted(c: bigint): bigint {
  const b = c + 1n;
  const r = (b & 3n) - c;
  return r;
}
export function upstream(c: bigint): bigint {
  const b = c + 2n;
  const r = (b & 3n) + c;
  return r;
}
