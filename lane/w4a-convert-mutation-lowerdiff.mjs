#!/usr/bin/env node
// node lane/w4a-convert-mutation-lowerdiff.mjs <repo> <file>...
// per unit of each file: entered at HEAD (a copy beside the file, so its imports resolve) and in the working tree
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { lowerFile } from '../langs/ts/lower.mjs';
const [repo, ...files] = process.argv.slice(2);
let b = 0, a = 0;
for (const rel of files) {
  const abs = path.join(repo, rel), copy = path.join(path.dirname(abs), `.w4a_head_${path.basename(abs)}`);
  fs.writeFileSync(copy, execFileSync('git', ['-C', repo, 'show', `HEAD:${rel}`]));
  try {
    const before = new Map(lowerFile(copy, null, { project: true }).units.map((u) => [u.unit, !u.refusal]));
    const after = new Map(lowerFile(abs, null, { project: true }).units.map((u) => [u.unit, !u.refusal]));
    const nb = [...before.values()].filter(Boolean).length, na = [...after.values()].filter(Boolean).length; b += nb; a += na;
    console.log(rel, 'entered', nb, '->', na, 'of', before.size, '/', after.size);
    for (const [u, ok] of after) if (ok && !before.get(u)) console.log('  +', u);
    for (const [u, ok] of before) if (ok && !after.get(u)) console.log('  -', u);
  } finally { fs.rmSync(copy, { force: true }); }
}
console.log('total entered', b, '->', a);
