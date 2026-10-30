#!/usr/bin/env node
// The construct step's lint in a child of its own (run.mjs runs the cases at once on its pool): the findings of
// lintFile on one case file that fall in the named unit, as JSON on stdout ({ count, first: { rule, msg } | null }).
//   node construct-lint.mjs <file> <unit>
import { loadProgram, topLevelFunctions, findingUnit } from '../common.mjs';
import { lintFile } from '../lint/lint.mjs';

const [file, fn] = process.argv.slice(2);
const loaded = loadProgram(file), inventory = topLevelFunctions(loaded.sf);
const findings = lintFile(file, null, { loaded }).filter((f) => findingUnit(loaded.sf, inventory, f)?.name === fn);
process.stdout.write(JSON.stringify({ count: findings.length, first: findings.length ? { rule: findings[0].rule, msg: findings[0].msg } : null }) + '\n');
