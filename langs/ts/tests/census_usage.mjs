#!/usr/bin/env node
// census.mjs argument handling: --help prints usage and exits 0; no arguments, an unknown leading flag, or --diff
// without two files print usage and exit 2. Run: node langs/ts/tests/census_usage.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const census = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'census.mjs');
const run = (args) => spawnSync(process.execPath, [census, ...args], { encoding: 'utf8' });
let fail = 0;
const expect = (name, args, code, stream) => {
  const r = run(args);
  const out = stream === 'stdout' ? r.stdout : r.stderr;
  const ok = r.status === code && /^usage: node census\.mjs/.test(out);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: exit ${r.status}${ok ? '' : `, ${stream} ${JSON.stringify(out.slice(0, 120))}, stderr ${JSON.stringify(r.stderr.slice(0, 200))}`}`);
  if (!ok) fail++;
};
expect('--help', ['--help'], 0, 'stdout');
expect('-h', ['-h'], 0, 'stdout');
expect('no arguments', [], 2, 'stderr');
expect('unknown leading flag', ['--bogus'], 2, 'stderr');
expect('--diff without files', ['--diff'], 2, 'stderr');
process.exit(fail ? 1 : 0);
