// The boundary walk: the first generated inputs take every combination of the compared values once, then free draws.
// Each changed unit differs only on a value away from its compared constants, so a walk that held its leaves on
// those constants for the whole run never showed the difference.
import { createHmac } from "node:crypto";

// a curve: the candidate moves the switch point of the two halves; the two thresholds give the same value, and a
// value between them (1) separates
export function ease(t: number): number {
  return t < 1.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// a rounding to a step: the candidate rounds where the parent truncates; 0, 1 and -1 agree, 7 separates
export function toStep(x: number): number {
  if (x === 0) return 0;
  return Math.round(x / 10) * 10;
}

export type Signed = { enabled: boolean; secret?: string; id?: string; mac?: string };

// a digest compare behind four truthiness guards: the candidate swaps the key and the algorithm, a difference seen
// only when every guard is passed
export function checkDigest(p: Signed): boolean {
  if (!p.enabled) return false;
  if (!p.secret) return false;
  if (!p.id) return false;
  if (!p.mac) return false;
  return createHmac(p.secret, "sha256").update(p.id).digest("hex") === p.mac;
}

// the candidate writes the conditional as two guards: the same comparisons in the same order
export function clampUnit(t: number): number {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

// untouched
export function scale(t: number): number {
  return t * 100;
}
