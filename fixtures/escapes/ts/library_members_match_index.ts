// expect: unsupported-member
// the index of a match of a global pattern depends on lastIndex, which the first exec moved
export function positions(s: string): number[] {
  const out: number[] = [];
  const re = /a+/g;
  let m = re.exec(s);
  while (m !== null) {
    out.push(m.index);
    m = re.exec(s);
  }
  return out;
}
