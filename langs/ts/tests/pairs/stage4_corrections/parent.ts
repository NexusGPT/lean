export interface Slot { n: number | null; u?: number; name: string }
export enum Tier { Low = "low", High = "high" }

export function fieldCross(x: Slot): boolean {
  return x.n === x.u;
}

export function notCross(a: number | null, b: number | undefined): boolean {
  return a !== b;
}

export function byName(x: Slot, y: Slot): boolean {
  return x.name < y.name;
}

export function tierOrder(a: Tier, b: Tier): boolean {
  return a < b;
}
