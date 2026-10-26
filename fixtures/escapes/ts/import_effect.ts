// expect: dynamic-eval
export function size(p: string): number {
  const fs = require("node:fs");
  return fs.readFileSync(p).length;
}
