// expect: string-code-unit
export function loneSurrogate(): string {
  return `value:\ud800`;
}
