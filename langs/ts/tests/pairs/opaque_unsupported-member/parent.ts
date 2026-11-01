// The opacity ladder (design/w1c-opaque-calls.md), rule `unsupported-member`: a match item of a pattern the unit cannot see. The statement holding it is one opaque
// step keyed by its text, reading every name it mentions, writing every name it assigns and every object in scope.

export function outside_member(s: string, re: RegExp): number {
  const n = s.length + 1;
  const g = s.match(re)?.[1] ?? "";
  return g.length + n * 2;
}

export function inside_member(s: string, re: RegExp): number {
  const n = s.length + 1;
  const g = s.match(re)?.[1] ?? "";
  return g.length + n;
}

export function read_member(s: string, re: RegExp, x: string): number {
  const t = x + s;
  const g = t.match(re)?.[1] ?? "";
  return g.length;
}

export function planted_member(s: string, re: RegExp): number {
  const g = s.match(re)?.[1] ?? "-";
  return g.length;
}
