export interface Svc { get(x: number): number; }
export function clamp(svc: Svc, x: number): number {
  const y = svc.get(x);
  return Math.max(
    0,
    1 + y,
  );
}
export function shifted(svc: Svc, x: number): number {
  const y = svc.get(x);
  return Math.max(
    0,
    y + 2,
  );
}
