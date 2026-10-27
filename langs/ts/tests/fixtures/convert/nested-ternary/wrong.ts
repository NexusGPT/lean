// a wrong after: the proof must refute it with a WITNESS
// nested-ternary: a conditional whose branch is a conditional, as a whole return and a whole initializer, becomes
// nested if statements; one inside a larger expression is listed
export function grade(n: number): string {
  if (n > 10) {
    return "high";
  } else if (n > 4) {
    return "mid";
  } else {
    return "low";
  }
}

export function tier(n: number): number {
  let t: number;
  if (n > 100) {
    t = 3;
  } else if (n > 10) {
    t = 2;
  } else {
    t = 1;
  }
  return t * 2;
}

export function label(n: number): string {
  return "size " + (n > 1 ? "big" : n > 0 ? "one" : "none");
}
