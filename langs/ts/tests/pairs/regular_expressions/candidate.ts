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
