#!/usr/bin/env node
// The value reading carries a const second name of a parameter's instance of a class of this file (lower.mjs
// carriedAliases, design/conformance-readings.md section 6): `const h = b`, then a write statement through either name
// rebinds the other, inside a loop too (the loop carries both), and the parameter leaves as a changed one. Where a write
// would not pass through such a statement the pair stays a holder and the value reading does not read the write (the
// alias-mutation refusal, graded: an opaque step holds it): the name handed to a call, the parameter rebound, a closure
// reading it. Each fixture leaves the heap core (a handle's method
// called in a loop), so the value reading is the one read. Run: node langs/ts/tests/carried-alias.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { opaqueLines } from '../translate/opaque.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const translate = path.join(here, '..', 'translate', 'translate.mjs');
const fixtures = path.join(here, 'fixtures', 'carried-alias');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-carried-alias-'));
let fail = 0;
const say = (ok, what, saw) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${saw ? ': ' + saw : ''}`); if (!ok) fail++; };
const tr = (name) => {
  const dfy = path.join(out, `${name}.dfy`);
  const r = spawnSync(process.execPath, [translate, path.join(fixtures, `${name}.ts`), '--core', '--heap', '--suffix', 'parent', '--no-project', '--out', dfy, '--prelude', path.join(out, `${name}.pre.dfy`)], { encoding: 'utf8' });
  return { status: r.status, err: `${r.stderr ?? ''}${r.stdout ?? ''}`.trim(), text: r.status === 0 ? fs.readFileSync(dfy, 'utf8') : '' };
};
try {
  const loop = tr('loop');
  say(loop.status === 0, 'loop: translated', loop.status === 0 ? '' : loop.err.slice(0, 300));
  say(/^\/\/ HEAP: *$/m.test(loop.text), 'loop: read by the value reading, not the heap core');
  say(/var h: Box := h\.\(total := [^\n]*\);\n\s*var b: Box := h;/.test(loop.text), 'loop: the write through h rebinds b');
  say(/var b: Box := b\.\(total := [^\n]*\);\n\s*var h: Box := b;/.test(loop.text), 'loop: the write through b rebinds h');
  say(/function sum_into_loop0_parent\([^)]*\bb: Box, h: Box\)/.test(loop.text), 'loop: the loop carries both names');
  say(/function sum_into_parent\([^)]*\): \(World, int, Box\)/.test(loop.text), 'loop: b leaves as a changed parameter');
  say(/\/\/ GUARD sum_into_parent: \{"exposed":\[\],"writesCopy":false/.test(loop.text), 'loop: the identity guard sees no copy write');
  // the value reading never reads the write: the alias-mutation refusal, graded `opaque: block`, makes the unit's block
  // one opaque step holding the write (design/w1a-opaque-mutation.md), and no field update of `h` is emitted
  for (const [name, why] of [['handed', 'h handed to a call'], ['rebound', 'b rebound'], ['closure', 'b read by a closure']]) {
    const r = tr(name);
    const steps = r.status === 0 ? (opaqueLines(r.text).get(`${name}_parent`)?.steps ?? []) : [];
    const held = steps.some((s) => String(s.rule).split(',').includes('alias-mutation') && s.findings.length && s.findings.every((f) => f[0] >= s.span[0] && f[2] <= s.span[2]));
    say(held && !/\bh\.\(total :=/.test(r.text), `${name}: ${why}, the write held by an alias-mutation opaque step`, held ? '' : r.status === 0 ? JSON.stringify(steps).slice(0, 300) : r.err.slice(0, 300));
  }
} finally { fs.rmSync(out, { recursive: true, force: true }); }
console.log(`carried-alias: ${fail ? fail + ' failed' : 'all hold'}`);
process.exit(fail ? 1 : 0);
