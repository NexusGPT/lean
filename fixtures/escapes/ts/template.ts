// expect: template
// a tagged template whose tag is an element access, not a name
export function tagged(tags: Array<(s: TemplateStringsArray) => string>, i: number): string {
  return tags[i]`hello`;
}
