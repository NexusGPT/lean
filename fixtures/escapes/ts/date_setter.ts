// expect: date-mutation
export function run(d: Date): number {
  d.setFullYear(2020);
  return d.getTime();
}
