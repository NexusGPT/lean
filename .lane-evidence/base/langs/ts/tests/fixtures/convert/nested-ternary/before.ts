// nested-ternary: a conditional whose branch is a conditional, as a whole return and a whole initializer, becomes
// nested if statements; one inside a larger expression is listed
export function grade(n: number): string {
  return n > 10 ? "high" : n > 5 ? "mid" : "low";
}

export function tier(n: number): number {
  const t: number = n > 100 ? 3 : n > 10 ? 2 : 1;
  return t * 2;
}

export function label(n: number): string {
  return "size " + (n > 1 ? "big" : n > 0 ? "one" : "none");
}
