// A parameter handed to Node's path functions (exec/usage.mjs pathModuleOf, lane w9o): every argument of a node:path
// function is a string, and Node throws on anything else. An untyped parameter (any, a JavaScript unit's) was drawn as a
// handle, which path.join rejects on every input, so both sides threw alike (PASS-bounded). Read as a string, the input
// reaches the change: logFile joins another file name and logPid joins another pid file (WITNESS, a default and
// a named import of the module); same is unchanged.
import path from "node:path";
import { join } from "node:path";

export function logFile(dir: any): string {
  return path.join(dir, "sink.log");
}

export function logPid(dir: any): string {
  return join(dir, "run", "sink.pid");
}

export function same(dir: any): string {
  return path.basename(dir);
}
