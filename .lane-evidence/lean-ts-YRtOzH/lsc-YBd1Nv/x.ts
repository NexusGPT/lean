export function double(x: number): number {
  return x + x;
}

export function quad(x: number): number {
  return double(double(x));
}

export function addBig(a: bigint, b: bigint): bigint {
  return a + b;
}
