import { report } from "lean-declared-fake";
export function calls(n: number): number { report(n); return n; }
