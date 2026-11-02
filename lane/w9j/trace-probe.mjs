// Diagnostic: load <file> in lean's sandbox, call its unit <name> with fakes for every argument, print the trace's
// most frequent operations when it stops.  node trace-probe.mjs <lean tree> <file> <unit>
const [lean, file, unit] = process.argv.slice(2);
const { sandbox } = await import(`${lean}/langs/ts/exec/run.mjs`);
const { Environment } = await import(`${lean}/langs/ts/exec/fake.mjs`);
const env = new Environment(1);
const ex = sandbox(env, null).load(file);
env.trace.length = 0;
const fn = ex.__lean_units?.[unit] ?? ex[unit];
const args = [0, 1, 2, 3, 4].map((k) => env.fake(`arg${k}`));
let out;
try { out = fn(...args); } catch (e) { out = `threw ${e && e.constructor && e.constructor.name}: ${String(e && e.message).slice(0, 200)}`; }
const counts = new Map();
for (const r of env.trace) { const k = `${r.op} ${String(r.path).replace(/\d+/g, '#').slice(0, 120)}`; counts.set(k, (counts.get(k) ?? 0) + 1); }
console.log('result:', typeof out === 'string' ? out : typeof out, 'trace', env.trace.length, 'freeGlobals', [...(env.freeGlobals ?? [])]);
console.log([...counts].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${v} ${k}`).join('\n'));
console.log('first:', env.trace.slice(0, 12).map((r) => `${r.op} ${r.path}`).join('\n  '));
