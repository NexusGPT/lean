// a list typed an array only by an `as` on JSON.parse, with no await: the foreach rewrite is refused
type Row = { aisle: string; c: number };
export function labels(text: string): string[] {
  const aisles = JSON.parse(text) as Row[];
  const out: string[] = [];
  aisles.forEach((a, i) => {
    out.push(`${i}:${a.aisle}`);
  });
  return out;
}
