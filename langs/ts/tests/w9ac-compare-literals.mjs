// Lane w9ac-compare-literals (design/w9ac-compare-literals.md): the world search's guided moves.
// 1. comparedTable: the reads a body compares against a literal (a member, a call, a local holding one, a length, a
//    switch's cases, `typeof x === 'undefined'`, loose equality with null), each with its innermost function's lines;
//    pathKey: the key a world path is read under.
// 2. guideOf: only the functions enclosing a statement the run entered give their literals.
// 3. searchWorld on a synthetic world in the three.js#35012 shape: the guard's read (`c.get()#1`) is answered a handle
//    early, a run that threw is climbed latest answer first, and every later read of the handle goes further; the
//    difference shows only when the guard's read is absent and the seeded fault behind it is taken back. With the guide
//    the climb sets the guard's read first and keeps it though it goes no further; without it the bound runs out.
// 4. The pair world_guard_path through exec/run.mjs: WITNESS (source: world), PASS-bounded under the break.
// 5. usage.mjs reads a callee of another local file (a named import, a namespace member, a base method through super):
//    the literals it compares the unit's arguments against are the parameter's (and the property path's) compares.
// 6. searchWorld with the one infected draw falsy on both sides ('' against null, which `x || d` erases): it waits, a
//    leaf it holds falsy is set truthy (unmask), and the unmasked draw is climbed; broken, the falsy draw is climbed
//    into the deep handles and the bound runs out.
// --break: LEAN_BREAK=w9ac-compare-literals,w9ac-callee-files,w9ac-falsy-last: parts 3 to 6 fail.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { comparedTable, guideOf, pathKey } from '../exec/compared.mjs';
import { searchWorld } from '../exec/search.mjs';
import { usage } from '../exec/usage.mjs';
import { loadProgram } from '../common.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), lean = path.join(here, '..');
const BREAK = process.argv.includes('--break');
if (BREAK) process.env.LEAN_BREAK = [process.env.LEAN_BREAK, 'w9ac-compare-literals', 'w9ac-callee-files', 'w9ac-falsy-last'].filter(Boolean).join(',');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w9ac-'));
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

// 1. the table
{
  const src = [
    'function dataOf(cache, node, stage) {',          // 1
    '  let data = cache.getData(node);',              // 2
    '  if (data === undefined) data = {};',            // 3
    '  if (this.layers.length === 0) return data;',    // 4
    '  const u = data.uniform;',                       // 5
    '  if (u == null) return null;',                   // 6
    '  switch (node.kind) { case "a": return 1; case 2: return 2; }', // 7
    '  if (typeof node.label === "undefined") return 3;', // 8
    '  const xs = [1].filter((x) => x.mode !== "off");', // 9
    '  if (node["tag"] !== true) return 4;',          // 10
    '  if (stage === "vertex") return 5;',            // 11
    '  return data;',                                  // 12
    '}',                                               // 13
    'if (config.debug === false) start();',            // 14
  ].join('\n');
  const rows = comparedTable(src, 'a.js');
  const has = (key, kind, from) => rows.some((r) => r.key === key && r.kinds.includes(kind) && (from === undefined || r.from === from));
  ok(has('getData()', 'undefined', 1), `a local holding a call's answer, compared with undefined: getData() (${JSON.stringify(rows)})`);
  ok(has('length', 'zero', 1), 'a length compared with 0');
  ok(has('uniform', 'undefined', 1) && has('uniform', 'null', 1), 'loose equality with null: both absent values, through the local u');
  ok(has('kind', 'lit:"a"', 1) && has('kind', 'lit:2', 1), 'a switch\'s case literals');
  ok(has('label', 'undefined', 1), 'typeof x === "undefined"');
  ok(has('mode', 'lit:"off"', 9) && !has('mode', 'lit:"off"', 1), 'a comparison in a callback is the callback\'s (its innermost function)');
  ok(has('tag', 'true', 1), 'an element read by a literal key, compared with true');
  ok(!rows.some((r) => r.key === 'stage' || r.key === 'vertex'), 'a parameter compared with a literal is no world read');
  ok(has('debug', 'false', 0) && rows.find((r) => r.key === 'debug').to === Infinity, 'module level: the whole file');
  ok(pathKey('this.globalCache.getData()#1') === 'getData()' && pathKey('this.globalCache.getData()#1.vertex.uniform') === 'uniform' && pathKey('fault:this.a.b()#1') === null && pathKey('a') === 'a', 'pathKey: the last member, a call without its count, no fault');
}

// 2. the guide of a run: the functions it entered
{
  const rows = [{ key: 'uniform', kinds: ['undefined'], from: 10, to: 20 }, { key: 'kind', kinds: ['lit:"a"'], from: 30, to: 40 }, { key: 'debug', kinds: ['false'], from: 0, to: Infinity }];
  const g = guideOf([{ file: 'f.js', start: 12, end: 12 }], (f) => (f === 'f.js' ? rows : null));
  ok(g.has('uniform') && !g.has('kind') && g.has('debug'), `a statement at line 12 enters 10-20 and the module, not 30-40 (${JSON.stringify([...g.keys()])})`);
  ok(guideOf([{ file: 'g.js', start: 12, end: 12 }], (f) => (f === 'f.js' ? rows : null)).size === 0, 'a file with no table gives nothing');
}

// 3. searchWorld in the three.js#35012 shape
{
  const DEEP = 16; // the handle the guard reads keeps answering: each later read goes further
  const run = async (recipe, w) => {
    const m = new Map(w), infected = recipe.from === 0;
    const answered = [{ path: 'this.cache', kind: m.get('this.cache') ?? 'zero' }];
    if (answered[0].kind !== 'fake') return { status: 'equal', answered, ran: 2, threw: true, infected, at: 0, guide };
    answered.push({ path: 'this.cache.get()#1', kind: m.get('this.cache.get()#1') ?? 'fake' });
    if (answered[1].kind === 'undefined') { // the record is made: the cache's set is the seeded fault until taken back
      answered.push({ path: 'fault:this.cache.set()#1', kind: m.get('fault:this.cache.set()#1') ?? 'fault' });
      if (answered[2].kind !== 'ok') return { status: 'equal', answered, ran: 3, threw: true, infected, at: 0, guide };
      return { status: infected ? 'diff' : 'equal', answered, ran: 9, threw: false, infected, at: 0, guide };
    }
    let p = 'this.cache.get()#1.any', ran = 4; // a handle: the layer lookup reads on, deeper with every handle it is given
    for (let d = 0; d < DEEP; d++, p += '.sub') { const kind = m.get(p) ?? 'undefined'; answered.push({ path: p, kind }); ran += 2; if (kind !== 'fake') return { status: 'equal', answered, ran, threw: true, infected, at: 0, guide }; }
    return { status: 'equal', answered, ran, threw: false, infected, at: 0, guide };
  };
  const guide = new Map([['get()', new Set(['undefined'])]]);
  const starts = [0, 1].map((i) => ({ recipe: { from: i, changes: [] }, answered: [{ path: 'this.cache', kind: 'zero' }], ran: 2, threw: true, infected: i === 0, at: 0, guide }));
  const go = () => searchWorld({ seed: 1, starts, run, changes: async () => [], maxInputs: 30, maxMs: 60_000 });
  const r = await go();
  ok(r.stop === 'divergence' && JSON.stringify(r.world) === JSON.stringify([['this.cache', 'fake'], ['this.cache.get()#1', 'undefined'], ['fault:this.cache.set()#1', 'ok']]), `the guard's read set absent first, kept though the fault behind it stops the run, then the fault taken back (${r.stop}, ${JSON.stringify(r.world ?? r.climbs)})`);
  ok(r.tried <= 5, `within five tries (${r.tried})`);
  ok(JSON.stringify(await go()) === JSON.stringify(r), 'the same starts, the same search');
}

// 4. the pair
{
  const d = path.join(here, 'pairs', 'world_guard_path'), out = path.join(tmp, 'path.json');
  const r = spawnSync('node', [path.join(lean, 'exec/run.mjs'), '--parent', path.join(d, 'parent.ts'), '--candidate', path.join(d, 'candidate.ts'), '--unit', 'Fallback.uniformOf', '--n', '30', '--seed', '1', '--no-project', '--out', out], { encoding: 'utf8', env: process.env, maxBuffer: 1 << 26 });
  ok(r.status === 0 || r.status === 2, `exec/run.mjs ran (exit ${r.status}: ${(r.stderr || '').slice(-300)})`);
  const res = JSON.parse(fs.readFileSync(out, 'utf8')), w = res.witnesses?.[0];
  ok(res.verdict === 'WITNESS' && w?.input?.source === 'world' && w.replayed === true, `world_guard_path: WITNESS from the world search (${res.verdict}, ${JSON.stringify(res.bound?.world ? { tried: res.bound.world.tried, stop: res.bound.world.stop } : null)})`);
}

// 5. a callee of another local file
{
  const dir = fs.mkdtempSync(path.join(tmp, 'callee-'));
  fs.writeFileSync(path.join(dir, 'tiers.ts'), 'export function cost(tier: string, n: number): number {\n  switch (tier) { case "gold": return n * 2; }\n  return tier === "silver" ? n : 0;\n}\nexport class Base {\n  rate(kind: string): number { return kind === "bulk" ? 2 : 1; }\n}\n');
  fs.writeFileSync(path.join(dir, 'unit.ts'), 'import { cost, Base } from "./tiers";\nimport * as tiers from "./tiers";\nexport function price(tier: string, n: number) { return cost(tier, n); }\nexport function priceOf(order: { tier: string; n: number }) { return tiers.cost(order.tier, order.n); }\nexport class Shop extends Base {\n  rate(kind: string): number { return super.rate(kind) + 1; }\n}\n');
  const { sf, checker } = loadProgram(path.join(dir, 'unit.ts'), { project: false });
  const lits = (n) => (n?.compares ?? []).map((x) => x.v ?? x);
  const p = usage(sf, 'price', checker), o = usage(sf, 'priceOf', checker), r = usage(sf, 'Shop.rate', checker);
  ok(lits(p.params[0].node).includes('gold') && lits(p.params[0].node).includes('silver'), `a named import: its switch case and its comparison (${JSON.stringify(p.params[0].node.compares)})`);
  ok(lits(o.params[0].node.fields.tier).includes('gold'), `a namespace member, through order.tier (${JSON.stringify(o.params[0].node.fields.tier?.compares ?? null)})`);
  ok(lits(r.params[0].node).includes('bulk'), `a base method through super (${JSON.stringify(r.params[0].node.compares)})`);
}

// 6. a falsy infection: unmask first
{
  const run = async (recipe, w) => {
    const m = new Map(w), unmasked = recipe.changes.some((c) => c.fromFalsy), infected = recipe.from === 0;
    const answered = [{ path: 'a', kind: m.get('a') ?? 'null' }];
    const base = { answered, infected, at: 0, ...(infected && !unmasked ? { falsy: true } : {}) };
    if (answered[0].kind !== 'fake') return { status: 'equal', ...base, ran: 2, threw: true };
    if (unmasked) return { status: infected ? 'diff' : 'equal', ...base, ran: 9, threw: false };
    let p = 'a.b', ran = 4; // '' and null both give the default: the world can only read on
    for (let d = 0; d < 16; d++, p += '.b') { const kind = m.get(p) ?? 'undefined'; answered.push({ path: p, kind }); ran += 2; if (kind !== 'fake') return { status: 'equal', ...base, ran, threw: true }; }
    return { status: 'equal', ...base, ran, threw: false };
  };
  const starts = [0, 1].map((i) => ({ recipe: { from: i, changes: [] }, answered: [{ path: 'a', kind: 'null' }], ran: 2, threw: true, infected: i === 0, at: 0, ...(i === 0 ? { falsy: true } : {}) }));
  const changes = async () => [{ at: [3], op: 'set', value: 'x', tier: 1, fromFalsy: true }];
  const r = await searchWorld({ seed: 1, starts, run, changes, maxInputs: 30, maxMs: 60_000 });
  ok(r.stop === 'divergence' && r.recipe?.changes?.length === 1 && JSON.stringify(r.world) === JSON.stringify([['a', 'fake']]), `the falsy draw waits, a falsy leaf set truthy infects it for good, then one move (${r.stop}, ${JSON.stringify(r.recipe ?? null)}, ${JSON.stringify(r.world ?? null)})`);
  ok(r.tried <= 4, `within four tries (${r.tried})`);
}

console.log(`w9ac-compare-literals: ${checks} checks pass${BREAK ? ' (--break: expected to fail)' : ''}`);
