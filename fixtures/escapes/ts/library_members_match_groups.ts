// expect: unsupported-member
// a named capture in one alternative of the pattern may not take part in the match: its value is undefined under a
// string type, so it is not read as a string (it is read as present or absent: a default, a test, or a place that
// holds undefined; a group that takes part in every match is read, pair regular_expressions)
export function domain(s: string): string {
  const m = /@(?<host>[a-z.]+)|#(?<tag>\w+)/.exec(s);
  if (!m?.groups) return "";
  return m.groups.host;
}
