import type { AuditPort } from "./ports";

// a variable declared with its type and assigned on every path before it is read
export function sign(n: number): string {
  let label: string;
  if (n < 0) label = "negative";
  else if (n === 0) label = "zero";
  else label = "positive";
  return label;
}

// `void call()` as a statement is the call; the audit is a world transition
export async function noteAndCount(audit: AuditPort, xs: readonly number[]): Promise<number> {
  void audit.record("count:" + xs.length);
  let total = 0;
  for (const x of xs) total = total + x;
  return total;
}

// a bare return inside a callback is the callback's, not the function's
export function firstBig(xs: readonly number[], limit: number): number | null {
  const hit = xs.find((x) => { if (x <= limit) return false; return true; });
  return hit === undefined ? null : hit;
}
