// expect: property-assign
// a function installed into `process` is called by the outside later; no transition reads that call
declare const process: { exitCode?: number; stdout: { write: (s: string) => boolean } };
export function hook(): void {
  process.stdout.write = (s: string): boolean => s.length > 0;
}
