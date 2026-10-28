#!/usr/bin/env node
// Lane B's hook runtime checked against React-tRace's scenarios (github.com/Zeta611/react-trace, MIT, test-react-side):
// each fixture under tests/fixtures/react-trace is one scenario ported with `print` from the fake module "probe", whose
// calls the trace records; the fixture states the expected call count and order (from the scenario's Jest test) or
// `error` when React throws. The runtime mounts the component, renders until stable, settles effects until stable,
// fires the listed clicks, and the recorded prints are compared. Usage: node react-trace.mjs [--dir <fixtures>] [--json]
import fs from 'node:fs';
import path from 'node:path';
import { Environment, render } from './fake.mjs';
import { sandbox, pickUnit, commitRender, commitEffects, treeHandlers, RenderLoop } from './run.mjs';
import { specOf } from './spec.mjs';
const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2); const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const dir = path.resolve(opt('--dir', path.join(here, '../tests/fixtures/react-trace')));
const results = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.tsx')).sort()) {
  const file = path.join(dir, f); const src = fs.readFileSync(file, 'utf8');
  const unit = (src.match(/^\/\/ unit:\s*(\S+)/m) ?? [])[1] ?? 'C';
  const expectPrints = (src.match(/^\/\/ expect-prints:\s*(.+)$/m) ?? [])[1]?.trim();
  const clicks = ((src.match(/^\/\/ clicks:\s*(.+)$/m) ?? [])[1] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const row = { scenario: f.replace(/\.tsx$/, ''), expect: expectPrints };
  try {
    const env = new Environment(1); env.shapes = specOf(file, unit, { project: false });
    env.faultDraw = () => false; // the probe is a recorder, never a faulting call into the world (lane B's seeded faults are for the pair runs)
    const ex = sandbox(env, dir).load(file); const u = pickUnit(ex, env.shapes, env); if (!u) throw new Error(`unit ${unit} not found`);
    await new Promise((r) => setImmediate(r)); env.trace.length = 0;
    const call = () => u.call([{}]);
    let tree = await commitEffects(env, call, 2000, await commitRender(env, call, 2000));
    for (const label of clicks) { const h = treeHandlers(tree).find((x) => x.label === label); if (!h) throw new Error(`no handler ${label}; have ${treeHandlers(tree).map((x) => x.label).join(', ')}`); h.fn(env.fake(`react:event:${label}`)); tree = await commitEffects(env, call, 2000, await commitRender(env, call, 2000)); }
    const prints = env.trace.filter((t) => t.op === 'call' && t.path === 'module:probe.print').map((t) => t.args[0]);
    row.got = JSON.stringify(prints);
    row.ok = expectPrints === 'error' ? false : (expectPrints.startsWith('[') ? JSON.stringify(JSON.parse(expectPrints)) === JSON.stringify(prints) : prints.length === Number(expectPrints));
  } catch (e) {
    row.got = e instanceof RenderLoop ? `error: ${e.message}` : `threw: ${String(e && e.message).slice(0, 120)}`;
    row.ok = expectPrints === 'error' && e instanceof RenderLoop;
  }
  results.push(row);
}
const summary = { scenarios: results.length, agree: results.filter((r) => r.ok).length, disagree: results.filter((r) => !r.ok).map((r) => ({ scenario: r.scenario, expect: r.expect, got: r.got })) };
if (args.includes('--json')) console.log(JSON.stringify({ summary, results }, null, 1)); else { for (const r of results) console.log(`${r.ok ? 'ok ' : 'BAD'} ${r.scenario.padEnd(40)} expect ${r.expect}  got ${r.got}`); console.log(JSON.stringify(summary)); }
process.exit(summary.disagree.length ? 1 : 0);
