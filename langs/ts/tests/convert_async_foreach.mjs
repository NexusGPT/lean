#!/usr/bin/env node
// The foreach transform refuses a list bound from an await (pyka src/server/alert-data.ts alertNewData). The pair in
// fixtures/convert_async_foreach/asserted is the evidence: the rows are typed an array only by an `as`, and check.mjs
// gives a WITNESS between the forEach (parent.ts) and the counted loop the converter used to write (candidate.ts).
// Checked here: (1) the converter leaves parent.ts unchanged and lists the site with the await reason; (2) the pair
// is still a WITNESS, so the refusal stays needed. Run: node langs/ts/tests/convert_async_foreach.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const fx = path.join(here, 'fixtures', 'convert_async_foreach', 'asserted');
const convert = path.join(here, '..', 'convert.mjs'), check = path.join(here, '..', 'check.mjs');
let fail = 0;
const say = (ok, what, saw) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${saw ? ': ' + saw : ''}`); if (!ok) fail++; };
const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'convert-async-foreach-'));
for (const f of ['package.json', 'tsconfig.json', 'ext-db.d.ts', 'parent.ts']) fs.copyFileSync(path.join(fx, f), path.join(repo, f));
const git = (...a) => spawnSync('git', ['-C', repo, ...a], { encoding: 'utf8' });
git('init', '-q'); git('add', '.'); git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
const json = path.join(repo, '..', path.basename(repo) + '.json');
const c = spawnSync(process.execPath, [convert, path.join(repo, 'parent.ts'), '--project', path.join(repo, 'tsconfig.json'), '--narrowed', '--no-prove', '--json', json], { encoding: 'utf8' });
const before = fs.readFileSync(path.join(fx, 'parent.ts'), 'utf8'), after = fs.readFileSync(path.join(repo, 'parent.ts'), 'utf8');
say(after === before, 'the converter leaves the awaited forEach as it is', after === before ? '' : 'parent.ts was rewritten');
let listed = null;
try { listed = JSON.parse(fs.readFileSync(json, 'utf8'))[0].files[0].listed.find((x) => x.rule === 'foreach'); } catch (e) { say(false, 'converter report', String(e.message) + ' ' + (c.stderr || '').slice(-200)); }
say(!!listed && /comes from an await/.test(listed.why), 'the site is listed with the await reason', listed ? listed.why.slice(0, 120) : 'no foreach row');
const k = spawnSync(process.execPath, [check, '--parent', path.join(fx, 'parent.ts'), '--candidate', path.join(fx, 'candidate.ts'), '--unit', 'alertNew', '--project', path.join(fx, 'tsconfig.json'), '--n', '30'], { encoding: 'utf8', maxBuffer: 1 << 28 });
let verdict = null;
try { verdict = JSON.parse(k.stdout).verdict; } catch { verdict = `unreadable: ${(k.stderr || k.stdout).slice(-200)}`; }
say(verdict === 'WITNESS', 'the forEach and the counted loop differ on the asserted rows', `check.mjs ${verdict}`);
fs.rmSync(repo, { recursive: true, force: true }); fs.rmSync(json, { force: true });
process.exit(fail ? 1 : 0);
