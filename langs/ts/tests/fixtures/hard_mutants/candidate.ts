// The hard kinds' fixture (tests/hard-mutants-fixture.mjs): one unit per kind of exec/mutate-hard.mjs, each of whose
// hard sites is planted and caught as a WITNESS by lean.

// callback-effect
export function doubled(xs: number[]): number[] {
  const out: number[] = [];
  xs.forEach((x) => {
    out.push(x * 2);
  });
  return out;
}

// effect-after-exit
export function record(n: number, log: string[]): number {
  if (n < 0) return 0;
  log.push("seen");
  return n * 2;
}

// dropped-cleanup
export function parseAll(items: string[], errors: string[]): number {
  let ok = 0;
  for (const s of items) {
    try {
      JSON.parse(s);
      ok++;
    } catch {
      errors.push(s);
    }
  }
  return ok;
}

// deep-boundary
export function grade(score: number, bonus: number, late: boolean): string {
  let total = score;
  if (late) {
    total = total - 10;
  }
  if (bonus !== 0) {
    total = total + bonus;
  }
  const capped = Math.min(total, 100);
  const floor = Math.max(capped, 0);
  const label = late ? "late" : "on time";
  const parts: string[] = [];
  const mark = late ? "*" : "";
  parts.push(label + mark);
  parts.push(String(floor));
  const summary = parts.join(" ");
  const shown = summary.trim();
  if (shown.length === 0) {
    return "none";
  }
  if (floor >= bonus) {
    return "pass " + summary;
  }
  return "fail " + summary;
}

// loop-bound
export function sumTo(n: number): number {
  let sum = 0;
  for (let i = 1; i < n; i++) sum += i;
  return sum;
}

// option-variant
type Unit = "ms" | "s" | "min";
function scale(unit: Unit): number {
  return unit === "ms" ? 1 : unit === "s" ? 1000 : 60000;
}
export function toMs(n: number): number {
  return n * scale("s");
}

// numeric-conversion
export function toCount(s: string): number {
  return parseInt(s, 10);
}
export function bucket(x: number): number {
  return Math.floor(x / 10);
}
export function perPage(n: number): number {
  return 100 / (n || 1);
}

// changed-default
export function pad(s: string, opts: { width?: number }): string {
  const { width = 4 } = opts;
  return s.length >= width ? s : " ".repeat(width - s.length) + s;
}

// swapped-effects
export function stack(xs: number[]): number[] {
  const out: number[] = [];
  out.push(1);
  out.push(xs.length);
  return out;
}
