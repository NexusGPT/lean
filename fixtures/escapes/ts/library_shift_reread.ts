// expect: mutator-value
// the statement that shifts the array also reads it: the order of the two reads matters
export function headAndCount(lines: string[]): string {
  const rest = [...lines];
  const line = `${rest.shift() ?? ""}:${rest.length}`;
  return line;
}
