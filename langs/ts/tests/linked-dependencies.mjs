#!/usr/bin/env node
// Lane B's child reads the node_modules folders module resolution visits (exec/run.mjs workerReads), also when one is a
// link out of the file's tree (a checkout whose dependencies live in another checkout or a shared store). The fixture's
// tree has no .git and links node_modules to a store beside it; the unit reads a field of a type that store declares.
// Without the store the child reads the parameter at an unresolved type and draws an opaque value, so the changed
// comparison `<=` to `<` goes unwitnessed. Exit 1 unless the parameter is drawn as its record and the verdict is WITNESS.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, 'fixtures/linked-dependencies');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-linked-'));
try {
  fs.cpSync(path.join(fixture, 'tree'), path.join(tmp, 'tree'), { recursive: true });
  fs.cpSync(path.join(fixture, 'store'), path.join(tmp, 'store'), { recursive: true });
  fs.symlinkSync(path.join(tmp, 'store'), path.join(tmp, 'tree/node_modules'), 'dir');
  const out = path.join(tmp, 'b.json');
  const r = spawnSync(process.execPath, [path.join(here, '../exec/run.mjs'), '--parent', path.join(tmp, 'tree/parent.ts'), '--candidate', path.join(tmp, 'tree/candidate.ts'), '--unit', 'fits', '--n', '30', '--project', path.join(tmp, 'tree/tsconfig.json'), '--out', out], { encoding: 'utf8' });
  let b = null; try { b = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* no report: fails below */ }
  const c = b?.spec?.params?.find((x) => x.name === 'c')?.spec ?? b?.bound?.spec?.params?.find((x) => x.name === 'c')?.spec;
  if (!c || c.kind !== 'record' || !c.fields?.bytes) { console.error(`FAIL: the parameter typed by the linked package is drawn as ${JSON.stringify(c ?? null).slice(0, 200)}, not as its declared record`); process.exit(1); }
  if (!b || b.verdict !== 'WITNESS') { console.error(`FAIL: fits through a linked node_modules: ${b ? `${b.verdict} ${b.reason ?? ''}` : `no report (exit ${r.status}): ${(r.stderr || r.stdout).slice(-300)}`}`); process.exit(1); }
  console.log('linked-dependencies: a declaration behind a node_modules link out of the tree is read by the lane B child; the parameter drawn as its record; fits <= against < WITNESS');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
