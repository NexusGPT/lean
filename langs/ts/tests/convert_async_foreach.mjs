#!/usr/bin/env node
// The foreach transform refuses a list whose array type rests on a type assertion (pyka src/server/alert-data.ts
// alertNewData), and only such a list. Fixtures in fixtures/convert_async_foreach:
//   asserted/   rows typed an array by an `as` in a same-file callee, read through await Promise.all: refused; the
//               pair parent.ts/candidate.ts (the forEach and the counted loop) is a WITNESS under check.mjs
//   external/   the same shape with the array type declared by the external: rewritten (the pair is PASS-bounded)
//   json-cast/  `JSON.parse(text) as Row[]` with no await: refused
// Run: node langs/ts/tests/convert_async_foreach.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, 'fixtures', 'convert_async_foreach');
const convert = path.join(here, '..', 'convert.mjs'), check = path.join(here, '..', 'check.mjs');
let fail = 0;
const say = (ok, what, saw) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${saw ? ': ' + saw : ''}`); if (!ok) fail++; };
// convert one fixture's parent.ts in a scratch repository; its text after, and the foreach row the converter listed
function convertFixture(name) {
  const fx = path.join(root, name);
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), `convert-async-foreach-${name}-`));
  for (const f of fs.readdirSync(fx)) if (f !== 'candidate.ts') fs.copyFileSync(path.join(fx, f), path.join(repo, f));
  const git = (...a) => spawnSync('git', ['-C', repo, ...a], { encoding: 'utf8' });
  git('init', '-q'); git('add', '.'); git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  const json = `${repo}.json`;
  const c = spawnSync(process.execPath, [convert, path.join(repo, 'parent.ts'), '--project', path.join(repo, 'tsconfig.json'), '--narrowed', '--no-prove', '--json', json], { encoding: 'utf8' });
  const before = fs.readFileSync(path.join(fx, 'parent.ts'), 'utf8'), after = fs.readFileSync(path.join(repo, 'parent.ts'), 'utf8');
  let listed = null, applied = null;
  try { const f = JSON.parse(fs.readFileSync(json, 'utf8'))[0].files[0]; listed = f.listed.find((x) => x.rule === 'foreach') ?? null; applied = f.applied.find((x) => x.rule === 'foreach') ?? null; } catch (e) { say(false, `${name}: converter report`, `${e.message} ${(c.stderr || '').slice(-200)}`); }
  fs.rmSync(repo, { recursive: true, force: true }); fs.rmSync(json, { force: true });
  return { changed: after !== before, listed, applied };
}
const refused = (name, what) => {
  const r = convertFixture(name);
  say(!r.changed && !!r.listed && /rests on a type assertion/.test(r.listed.why), `${name}: ${what} is refused`, r.listed ? r.listed.why.slice(0, 110) : r.changed ? 'rewritten' : 'no foreach row');
};
refused('asserted', 'a list typed by an `as` in a same-file callee, awaited');
refused('json-cast', 'a list typed by `JSON.parse(..) as Row[]`, not awaited');
const d = convertFixture('external');
say(d.changed && !!d.applied, 'external: an awaited list with a declared array type is rewritten', d.applied ? 'applied' : d.listed ? `listed: ${d.listed.why.slice(0, 110)}` : 'no foreach row');
const fx = path.join(root, 'asserted');
const k = spawnSync(process.execPath, [check, '--parent', path.join(fx, 'parent.ts'), '--candidate', path.join(fx, 'candidate.ts'), '--unit', 'alertNew', '--project', path.join(fx, 'tsconfig.json'), '--n', '30'], { encoding: 'utf8', maxBuffer: 1 << 28 });
let verdict = null;
try { verdict = JSON.parse(k.stdout).verdict; } catch { verdict = `unreadable: ${(k.stderr || k.stdout).slice(-200)}`; }
say(verdict === 'WITNESS', 'asserted: the forEach and the counted loop differ on the asserted rows', `check.mjs ${verdict}`);
process.exit(fail ? 1 : 0);
