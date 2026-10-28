export function squares(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(i * i);
  }
  return out;
}
