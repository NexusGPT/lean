// a regular expression literal in a call is a bodiless function of its text and its operands; the named captures of
// a match of a non-global literal bound to a const are one more such function (heap-stage5.md section 6)
export function isCode(s: string): boolean {
  return /^[A-Z]{3}$/.test(s);
}

export function tidy(s: string): string {
  return s.replace(/\s+/g, " ");
}

export function year(s: string): string {
  const m = s.match(/(?<y>\d{4})-(?<mo>\d{2})/);
  if (!m || !m.groups) return "";
  return m.groups.y;
}

export function month(s: string): string {
  const m = /(?<y>\d{4})-(?<mo>\d{2})/.exec(s);
  if (m === null || m.groups === undefined) return "";
  return m.groups.mo;
}

// a numbered capture of a group that may not take part is undefined when it does not (ECMA-262 22.2.7.2): `m[2]` of
// `(a)|(b)` on "a" is undefined, so the default decides the result
export function second(s: string): string {
  const m = s.match(/(a)|(b)/);
  if (!m) return "";
  return m[2] ?? "z";
}

export function first(s: string): string {
  const m = s.match(/(\d+)-(\d+)/);
  if (m === null) return "";
  return m[1];
}

export function day(s: string): string {
  const m = s.match(/(?<y>\d{4})-(?<mo>\d{2})/);
  if (!m || !m.groups) return "";
  const { mo } = m.groups;
  return mo;
}

export function keyed(s: string): string {
  const m = s.match(/(?<y>\d{4})-(?<mo>\d{2})/);
  if (!m || !m.groups) return "";
  return m.groups["y"];
}

const STAMP = /(?<y>\d{4})-(?<mo>\d{2})/;

export function held(s: string): string {
  const m = s.match(STAMP);
  return m?.groups?.mo ?? "";
}

export function either(s: string): string {
  const m = s.match(/(?<a>x+)|(?<b>y+)/);
  return m?.groups?.b ?? "none";
}
