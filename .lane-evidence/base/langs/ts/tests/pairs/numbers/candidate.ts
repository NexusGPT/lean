export function average(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let total = 0;
  for (const x of xs) total += x;
  return total / xs.length;
}
export function vat(net: number, rate: number): number {
  return net + net * rate / 100;
}
export function discounted(price: number, percent: number): number {
  return price * (1 - percent / 100);
}
export function pages(total: number, size: number): number {
  return Math.floor(total / size) + 1;
}
