// Test262 as a corpus of call patterns for the library transition table: every test file of the listed directories runs
// under node with the Test262 harness, inside lane B's built-in call recorder; each recorded call is checked against its
// row of translate/library.json. This proves nothing (a finite corpus) and refutes a row the moment the engine disagrees
// with it. Usage: node test262.mjs <test262 checkout> [--dirs a,b] [--out report.json]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { startRecording, stopRecording, checkRecords } from './transitions.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith('--'));
if (!root) { console.error('usage: test262.mjs <test262 checkout> [--dirs a,b] [--out report.json]'); process.exit(2); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const DIRS = (opt('--dirs') ?? 'test/built-ins/Array/prototype/push,test/built-ins/Array/prototype/unshift,test/built-ins/Array/prototype/pop,test/built-ins/Array/prototype/shift,test/built-ins/Array/prototype/splice,test/built-ins/Array/prototype/reverse,test/built-ins/Array/prototype/sort,test/built-ins/Array/prototype/slice,test/built-ins/Array/prototype/concat,test/built-ins/Array/prototype/map,test/built-ins/Array/prototype/filter,test/built-ins/Map/prototype/set,test/built-ins/Map/prototype/get,test/built-ins/Map/prototype/has,test/built-ins/Map/prototype/delete,test/built-ins/Set/prototype/add,test/built-ins/Set/prototype/has,test/built-ins/Set/prototype/delete,test/built-ins/Object/assign').split(',');
const table = JSON.parse(fs.readFileSync(path.join(here, '../translate/library.json'), 'utf8'));
const harness = (name) => fs.readFileSync(path.join(root, 'harness', name), 'utf8');
const base = harness('assert.js') + '\n' + harness('sta.js') + '\n';
const meta = (text) => { const m = text.match(/\/\*---([\s\S]*?)---\*\//); if (!m) return {}; const out = {}; const inc = m[1].match(/includes:\s*\[([^\]]*)\]/); if (inc) out.includes = inc[1].split(',').map((s) => s.trim()).filter(Boolean); out.negative = /\nnegative:/.test(m[1]); const fl = m[1].match(/flags:\s*\[([^\]]*)\]/); out.flags = fl ? fl[1].split(',').map((s) => s.trim()) : []; out.features = (m[1].match(/features:\s*\[([^\]]*)\]/)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean); return out; };
const report = { root, dirs: {}, totals: { files: 0, run: 0, skipped: 0, threw: 0, records: 0, defects: 0, outOfModel: 0, callbackEffects: 0 }, defects: [] };
for (const dir of DIRS) {
  const full = path.join(root, dir); if (!fs.existsSync(full)) { report.dirs[dir] = { missing: true }; continue; }
  const files = fs.readdirSync(full).filter((f) => f.endsWith('.js') && !f.endsWith('_FIXTURE.js')).sort();
  const d = { files: files.length, run: 0, skipped: 0, threw: 0, records: 0, defects: 0, outOfModel: 0, callbackEffects: 0 };
  for (const f of files) {
    const text = fs.readFileSync(path.join(full, f), 'utf8'); const m = meta(text);
    if (m.negative || m.flags.includes('async') || m.flags.includes('module') || m.flags.includes('raw')) { d.skipped++; continue; } // a negative test expects a parse or runtime error; async and module forms need a loader
    let src = base; for (const inc of m.includes ?? []) { try { src += harness(inc) + '\n'; } catch { d.skipped++; src = null; break; } }
    if (src === null) continue;
    src += (m.flags.includes('onlyStrict') ? '"use strict";\n' : '') + text;
    const records = [];
    const context = vm.createContext({ print: () => {}, console: { log: () => {} } }); // the context's own built-ins: a test may change its prototypes, and the host realm stays clean
    const realm = vm.runInContext('({ Array, Map, Set, Object })', context);
    startRecording(records, realm);
    try { vm.runInContext(src, context, { filename: `${dir}/${f}`, timeout: 5000 }); d.run++; } catch (e) { d.threw++; d.run++; } finally { stopRecording(); }
    const defects = checkRecords(records, table);
    d.records += records.length; d.defects += defects.length; d.outOfModel = (d.outOfModel ?? 0) + (defects.outOfModel ?? 0); d.callbackEffects = (d.callbackEffects ?? 0) + (defects.callbackEffects ?? 0);
    for (const x of defects) report.defects.push({ file: `${dir}/${f}`, op: x.op, why: x.why, expected: x.expected, record: { before: x.record.before, after: x.record.after, resultKind: x.record.resultKind, args: x.record.beforeArgs } });
  }
  report.dirs[dir] = d; for (const k of Object.keys(d)) report.totals[k] += d[k];
  console.error(`${dir}: ${d.run} run (${d.threw} threw), ${d.skipped} skipped, ${d.records} records, ${d.defects} defects`);
}
const out = opt('--out'); if (out) fs.writeFileSync(out, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report.totals));
