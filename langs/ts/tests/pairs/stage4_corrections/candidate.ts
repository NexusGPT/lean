export interface Slot { n: number | null; u?: number; name: string }
export enum Tier { Low = "low", High = "high" }

export function fieldCross(x: Slot): boolean {
  return x.n == null && x.u == null ? true : x.n === x.u;
}

export function notCross(a: number | null, b: number | undefined): boolean {
  return a == null && b == null ? false : a !== b;
}

export function byName(x: Slot, y: Slot): boolean {
  return y.name > x.name;
}

export function tierOrder(a: Tier, b: Tier): boolean {
  return b > a;
}
