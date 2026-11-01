// The mutant study's fixture (tests/mutants-fixture.mjs): two units whose every planted change lane B shows.
export function total(xs: number[], log: string[]): number {
  let sum = 0;
  for (const x of xs) sum = sum + x;
  log.push("total");
  return sum * 3;
}

export function label(n: number, tags: string[]): string {
  if (n > 0) { tags.push("positive"); } else { tags.push("other"); }
  return tags.join(",");
}
