// the node:test dialect of a callback's spy beside a hand stub of the clock, restored however the case ends (design/w9as-merge.md)
export function tagAll(items: string[], f: (s: string) => string): string[] {
  const at = Date.now();
  return items.map((s) => `${f(s)}@${at}`);
}
