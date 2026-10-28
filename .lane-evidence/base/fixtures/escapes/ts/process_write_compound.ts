// expect: property-assign
// a compound write to a field of `process` reads and writes the world at once; bind the old value first
declare const process: { exitCode: number };
export function bump(): void {
  process.exitCode += 1;
}
