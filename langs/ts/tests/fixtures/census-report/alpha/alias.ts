export function append(values: number[]): number {
  const alias = values;
  alias.push(1);
  return alias.length;
}
