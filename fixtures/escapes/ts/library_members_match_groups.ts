// expect: unsupported-member
// a named capture in one alternative of the pattern may not take part in the match: its value is undefined under a
// string type, so it is not read (a group that takes part in every match is read, pair regular_expressions)
export function domain(s: string): string | undefined {
  const m = /@(?<host>[a-z.]+)|#(?<tag>\w+)/.exec(s);
  return m?.groups?.host;
}
