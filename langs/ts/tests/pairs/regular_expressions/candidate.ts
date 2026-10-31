// a regular expression literal in a call is a bodiless function of its text and its operands; the named captures of
// a match of a non-global literal bound to a const are one more such function (heap-stage5.md section 6)
export function isCode(s: string): boolean {
  const t = s;
  return /^[A-Z]{3}$/.test(t) === true;
}

export function tidy(s: string): string {
  return s.replace(/\s+/g, "");
}

export function year(s: string): string {
  const m = s.match(/(?<y>\d{4})-(?<mo>\d{2})/);
  return m?.groups?.y ?? "";
}

export function month(s: string): string {
  const m = /(?<y>\d{4})-(?<mo>\d{2})/.exec(s);
  if (m === null || m.groups === undefined) return "";
  return m.groups.y;
}

// a numbered capture of a group that may not take part is undefined when it does not (ECMA-262 22.2.7.2): `m[2]` of
// `(a)|(b)` on "a" is undefined, so the default decides the result
export function second(s: string): string {
  const m = s.match(/(a)|(b)/);
  if (!m) return "";
  return m[2] ?? "y";
}

export function first(s: string): string {
  const m = /(\d+)-(\d+)/.exec(s);
  return m ? m[1] : "";
}

export function day(s: string): string {
  const m = s.match(/(?<y>\d{4})-(?<mo>\d{2})/);
  return m?.groups?.mo ?? "";
}

export function keyed(s: string): string {
  const m = s.match(/(?<y>\d{4})-(?<mo>\d{2})/);
  if (!m || !m.groups) return "";
  return m.groups.y;
}

export function held(s: string): string {
  const m = s.match(/(?<y>\d{4})-(?<mo>\d{2})/);
  return m?.groups?.mo ?? "";
}

export function either(s: string): string {
  const m = s.match(/(?<a>x+)|(?<b>y+)/);
  return m?.groups?.b ?? "";
}
