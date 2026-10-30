// a wrong after: the proof must refute it with a WITNESS
// labels: by default only a proved site is rewritten; a migration site (forEach) and a conditional site whose
// precondition the lint does not decide (var) are listed for a person
export function grade(n: number): string {
  if (n > 10) {
    return "high";
  } else if (n >= 5) {
    return "mid";
  } else {
    return "low";
  }
}

export function weighted(xs: number[]): number {
  let t = 0;
  xs.forEach((x, i) => { t += x * i; });
  return t;
}

export function next(value: number): number {
  var result = value + 1;
  return result * 2;
}
