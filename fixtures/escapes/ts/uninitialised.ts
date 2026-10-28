// expect: uninitialised
// a destructuring declaration with no initial value (TypeScript itself reports TS1182)
export function pair(): number {
  let [a, b]: number[];
  return 1;
}
