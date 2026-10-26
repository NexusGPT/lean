// expect: operator-value-context
export function taggedTarget(a: { tag(s: TemplateStringsArray): string }, b: { tag(s: TemplateStringsArray): string }): string {
  let current = a;
  return (current = b).tag`value`;
}
