import fs from 'node:fs';
import { loadProgram } from '../langs/ts/common.mjs';
import { runNew } from '../langs/ts/exec/new-unit.mjs';
const opts = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let loaded;
for (const unit of opts.units) {
  const result = await runNew({ candidate: opts.file, unit: unit.name, n: 3, seed: 1, ms: 500, project: true, loaded: () => loaded ??= loadProgram(opts.file, { project: true }) });
  fs.appendFileSync(opts.out, JSON.stringify({ ...unit, result }) + '\n');
  global.gc?.();
}
