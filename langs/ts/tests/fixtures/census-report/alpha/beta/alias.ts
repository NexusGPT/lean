export function appendAgain(values: number[]): number {
  const alias = values;
  alias.push(2);
  return alias.length;
}
