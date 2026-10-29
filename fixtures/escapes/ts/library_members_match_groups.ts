// expect: unsupported-member
// the named captures are an object the match builds; name the capture by position instead
export function domain(s: string): string | undefined {
  const m = /@(?<host>[a-z.]+)/.exec(s);
  return m?.groups?.host;
}
