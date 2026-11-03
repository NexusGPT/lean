// Lane w9aj-numeric-conversion (design/w9aj-numeric-conversion.md): the drawn inputs tell one numeric conversion from
// another.
// 1. conversions.mjs: the conversion a node applies (its family, its argument, its own form) and the reads that flow
//    into the argument (arithmetic, a local, a text kept but for case or blanks, another conversion); the family lists.
// 2. usage.mjs: a leaf a conversion takes carries the family (`converts`); the two versions converting a leaf
//    differently is `convChanged`. Broken (w9aj-conversions): no leaf carries one.
// 3. spec.mjs: the leaf's boundary holds the family's values its type admits, NaN and -0 apart from null and 0.
// 4. search.mjs changesOf: the input search's leaf changes of a leaf two versions convert differently hold the
//    family's values at tier 0. Broken (w9aj-conversion-changes): none.
// 5. compared.mjs and searchWorld: a read a changed conversion takes is an answer the world search sets to the family's
//    values on a draw no difference reached; a synthetic world whose difference shows only on a NaN answer. Broken
//    (w9aj-world-conversions): no such row, no try, the search stops with no input infected.
// --break: LEAN_BREAK=w9aj-conversions,w9aj-conversion-changes,w9aj-world-conversions: parts 2 to 5 fail. Each name
// alone fails its own part (2 and on for w9aj-conversions, 4 for w9aj-conversion-changes, 5 for w9aj-world-conversions).
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ts, loadProgram } from '../common.mjs';
import { conversionOf, flowsInto, FAMILY_VALUES, valuesOf, worldKindOf } from '../exec/conversions.mjs';
import { comparedTable, changedConversions } from '../exec/compared.mjs';
import { searchWorld, changesOf } from '../exec/search.mjs';
import { usage, mergeUsage } from '../exec/usage.mjs';
import { specOf } from '../exec/spec.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const BREAK = process.argv.includes('--break');
if (BREAK) process.env.LEAN_BREAK = [process.env.LEAN_BREAK, 'w9aj-conversions', 'w9aj-conversion-changes', 'w9aj-world-conversions'].filter(Boolean).join(',');
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const pair = (name, side) => path.join(here, 'pairs', name, `${side}.ts`);

// 1. the syntax
{
  const sf = ts.createSourceFile('a.ts', [
    'const a = Number(s); const b = parseInt(s, 10); const c = Number.parseFloat(s); const d = +s;',
    'const e = Math.floor(x / 4); const f = ~~x; const g = x | 0; const h = isNaN(v); const i = Number.isFinite(v);',
    'const j = m.get(k) || 0; const k2 = m.get(k) || ""; const l = Math.max(x, 1); const n = Number.isInteger(v);',
  ].join('\n'), ts.ScriptTarget.Latest, true);
  const got = [];
  const walk = (n) => { const c = conversionOf(n); if (c) got.push(`${c.family}:${c.by}:${c.arg.getText(sf)}`); ts.forEachChild(n, walk); };
  walk(sf);
  ok(JSON.stringify(got) === JSON.stringify(['parse:Number:s', 'parse:parseInt:s', 'parse:Number.parseFloat:s', 'parse:+:s', 'round:Math.floor:x / 4', 'round:~~:x', 'round:|0:x', 'nan:isNaN:v', 'nan:Number.isFinite:v', 'fallback:||:m.get(k)']), `the conversions, their family, form and argument (${JSON.stringify(got)})`);
  const sf2 = ts.createSourceFile('b.ts', 'function f(o, s) { const t = s.trim(); const h = Number(o.h ?? "0") * 60; return Math.floor(parseFloat(t) + h / 60); }', ts.ScriptTarget.Latest, true);
  const fn = sf2.statements[0], ret = fn.body.statements[2].expression;
  const locals = new Map(fn.body.statements.slice(0, 2).map((s) => [s.declarationList.declarations[0].name.text, s.declarationList.declarations[0].initializer]));
  const flows = flowsInto(conversionOf(ret).arg, (id) => locals.get(id.text) ?? null).map((e) => e.getText(sf2));
  for (const x of ['s', 'o.h', 'o.h ?? "0"', 't', 'h']) ok(flows.includes(x), `${x} flows into the rounding (${JSON.stringify(flows)})`);
  for (const [fam, vs] of Object.entries(FAMILY_VALUES)) ok(vs.length >= 4 && vs.every(([, why]) => typeof why === 'string' && why.length > 8), `the ${fam} family: every value with the pair it separates`);
  ok(valuesOf('fallback').some((v) => Number.isNaN(v)) && valuesOf('fallback').some((v) => Object.is(v, -0)), 'the fallback family holds NaN and -0');
  ok(worldKindOf(NaN) === 'num:NaN' && worldKindOf(-0) === 'num:-0' && worldKindOf(0) === 'zero' && worldKindOf('12px') === 'lit:"12px"' && worldKindOf(-1.5) === 'lit:-1.5', 'answers as world kinds');
}

// 2. the reading of the inputs, on both versions
const useOf = (name, unit) => {
  const P = loadProgram(pair(name, 'parent'), { project: false }), C = loadProgram(pair(name, 'candidate'), { project: false });
  return mergeUsage(usage(C.sf, unit, C.checker), usage(P.sf, unit, P.checker));
};
{
  const ps = useOf('conversion_flow', 'pageSize').params[0].node;
  ok(ps.converts.includes('parse') && ps.convChanged, `pageSize: the trimmed local is converted, differently by the two versions (${JSON.stringify({ converts: ps.converts, by: ps.convertedBy })})`);
  const off = useOf('conversion_flow', 'offsetOf').params[0].node.fields.offset;
  ok(off && off.converts.includes('parse'), 'offsetOf: query.offset, lowered behind a default, is converted');
  const b = useOf('conversion_round', 'bucketOf').params[0].node;
  ok(b.converts.includes('round') && b.converts.includes('parse') && b.convChanged, `bucketOf: the parsed text is rounded (${JSON.stringify(b.converts)})`);
  const h = useOf('conversion_round', 'shiftOf').params[0].node.fields.hours;
  ok(h && h.converts.includes('round'), 'shiftOf: the field parsed, scaled and divided back is rounded');
}

// 3. the draws' boundary
const boundaryOf = (s) => s.boundary ?? (s.options ?? []).find((o) => o.boundary)?.boundary;
{
  const sp = specOf(pair('conversion_flow', 'candidate'), 'pageSize', { project: false, usageFrom: pair('conversion_flow', 'parent') });
  const b = boundaryOf(sp.params[0].spec);
  ok(b && ['1.5', '12px', '1e3', ''].every((x) => b.cmp.includes(x)), `pageSize draws the parse family's texts (${JSON.stringify(b?.cmp)})`);
  const sr = specOf(pair('conversion_round', 'candidate'), 'bucketOf', { project: false, usageFrom: pair('conversion_round', 'parent') });
  const br = boundaryOf(sr.params[0].spec);
  ok(br && br.cmp.includes('-1.5') && br.cmp.includes('1.5'), `bucketOf draws the rounding family's texts (${JSON.stringify(br?.cmp)})`);
  ok(!br.cmp.some((x) => typeof x === 'number'), `a string leaf draws no number of the family (${JSON.stringify(br.cmp)})`);
}

// 4. the input search's leaf changes
{
  const sp = specOf(pair('conversion_flow', 'candidate'), 'pageSize', { project: false, usageFrom: pair('conversion_flow', 'parent') });
  const lits = { strings: [], numbers: [], near: { strings: [], numbers: [] } };
  const cs = changesOf(['words'], sp.params, sp.defs, lits);
  const t0 = cs.filter((c) => c.tier === 0).map((c) => c.value);
  ok(['1.5', '12px', '0x1A'].every((x) => t0.includes(x)), `the leaf two versions convert differently changes to the parse family's texts first (tier 0: ${JSON.stringify(t0)})`);
}

// 5. the world: a read a changed conversion takes
{
  const src = 'import { registry } from "r";\nexport class R {\n  depthOf(scene) {\n    const d = (registry.get(scene) || 0) - 1;\n    return d <= 0 ? 0 : d;\n  }\n}\n';
  const rows = comparedTable(src, 'r.ts');
  const conv = changedConversions(rows, new Set([4]));
  ok(conv.get('get()')?.includes('num:NaN') && conv.get('get()')?.includes('empty'), `the read the changed fallback takes, with the fallback family's answers (${JSON.stringify([...conv])})`);
  ok(changedConversions(rows, new Set([5])).size === 0, 'a conversion on an unchanged line gives none');
  // a synthetic world: two draws, neither infected; the depth differs only when registry.get() answers NaN
  const answered = [{ path: 'registry', kind: 'fake' }, { path: 'registry.get()#1', kind: 'fake' }];
  const starts = [0, 1].map((i) => ({ recipe: { from: i, changes: [] }, answered, ran: 2, threw: false, infected: false, at: 1 }));
  const tries = [];
  const run = async (recipe, world) => { tries.push(JSON.stringify(world)); const nan = world.some(([p, k]) => p === 'registry.get()#1' && k === 'num:NaN'); return { status: nan ? 'diff' : 'equal', answered, ran: 2, threw: false, infected: false, at: 1 }; };
  const r = await searchWorld({ seed: 1, starts, run, changes: async () => [], maxInputs: 30, maxMs: 60000, conversions: new Map([['get()', ['num:NaN', 'zero', 'empty', 'false']]]) });
  ok(r.stop === 'divergence' && JSON.stringify(r.world) === JSON.stringify([['registry.get()#1', 'num:NaN']]) && r.tried === 1, `the answer set to NaN on the first draw: a divergence in one try (${r.stop}, ${JSON.stringify(r.world)}, ${r.tried}; ${tries.join(' ')})`);
}

console.log(`w9aj-numeric-conversion: ${checks} checks pass${BREAK ? ' (--break: expected to fail)' : ''}`);
