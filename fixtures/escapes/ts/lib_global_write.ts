// expect: property-assign
/// <reference lib="dom" />
// a write into a lib global is a change of the outside the sandbox does not observe: it stays refused
export function goTo(url: string): void {
  location.href = url;
}
