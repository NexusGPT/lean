// inproc.mjs <lean tree> <parent> <candidate> <unit> <n>: lane B's runPair for one unit in this process (no worker, no
// sandbox), so a --cpu-prof of this process covers lane B's own work. Prints the verdict and per-input timing crumbs.
import path from 'node:path';
const [lean, parent, candidate, unit, n] = process.argv.slice(2);
const { runPair } = await import(path.join(lean, 'langs/ts/exec/run.mjs'));
const t0 = Date.now();
const r = await runPair({ parent, candidate, unit, n: Number(n), seed: 1, inProcess: true, unitSeconds: 3600 });
console.log(JSON.stringify({ verdict: r.verdict, reason: r.reason ?? null, ms: Date.now() - t0 }));
