#!/usr/bin/env node
// The unit listing names a member of a module literal by the path code reaches it by (design/exported-units.md): a class
// `Ops` and `module.exports.Ops = {...}` in one JavaScript file list `Ops.add` and `exports.Ops.add`, two units, and a
// lint finding inside each is attributed to its own unit. Before, the literal's member took the class's name and was
// dropped from the inventory while the lint still checked it, a finding of no unit. Exit 1 on any failure.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadProgram, topLevelFunctions, findingUnit } from '../common.mjs';
import { lintFile } from '../lint/lint.mjs';
import { lowerFile } from '../lower.mjs';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-listing-'));
const file = path.join(dir, 'a.js');
fs.writeFileSync(file, 'class Ops { add(a) { return a; } }\nmodule.exports.Ops = { add(a) { return a + 1; } };\n');
const failures = [];
const check = (ok, what) => { if (!ok) failures.push(what); };
const { sf } = loadProgram(file, { project: false });
const units = topLevelFunctions(sf);
check(units.has('Ops.add') && units.has('exports.Ops.add') && units.size === 2, `inventory lists ${[...units.keys()].join(', ')}; expected Ops.add and exports.Ops.add`);
const findings = lintFile(file, null, { project: false }).filter((f) => f.rule === 'untyped-js');
const owners = findings.map((f) => findingUnit(sf, units, f)?.name ?? null).sort();
check(owners.length === 2 && owners[0] === 'Ops.add' && owners[1] === 'exports.Ops.add', `untyped-js findings attributed to ${JSON.stringify(owners)}; expected one per unit`);
const record = lowerFile(file, null, { project: false });
const refused = Object.fromEntries(record.units.map((u) => [u.unit, u.refusal?.rule ?? null]));
check(refused['Ops.add'] === 'untyped-js' && refused['exports.Ops.add'] === 'untyped-js', `record refusals ${JSON.stringify(refused)}; expected untyped-js on both units`);
fs.rmSync(dir, { recursive: true, force: true });
if (failures.length) { for (const f of failures) console.error(`FAIL ${f}`); process.exit(1); }
console.log('unit-listing: a same-named class and exports-property literal list two units (Ops.add, exports.Ops.add); the lint and the record attribute each refusal to its own unit');
