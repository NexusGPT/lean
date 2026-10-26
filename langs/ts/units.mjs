#!/usr/bin/env node
// lean units: the units of one TypeScript file (top-level functions, arrow consts, class methods) with their lines.
//   node units.mjs <file.ts> [--project <tsconfig>|--no-project]   -> JSON list [{name, form, top, start, end, lines}]
// Syntax only when --no-project; the names match what check.mjs, run.mjs and translate.mjs take as --unit.
import fs from 'node:fs';
import path from 'node:path';
import { ts, loadProgram, topLevelFunctions, lineOf } from './common.mjs';

const a = process.argv.slice(2);
const file = a[0];
const project = a.includes('--no-project') ? false : a.includes('--project') ? a[a.indexOf('--project') + 1] : true;
const { sf } = loadProgram(path.resolve(file), { project });
const out = [];
for (const [name, u] of topLevelFunctions(sf)) {
  const start = lineOf(sf, u.node.getStart(sf)), end = lineOf(sf, u.node.getEnd());
  out.push({ name, form: u.cls ? 'method' : 'function', top: !u.cls, start, end, lines: end - start + 1 });
}
process.stdout.write(JSON.stringify(out));
