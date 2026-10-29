#!/usr/bin/env node
// Parent/parent control for lane B. Every discovered unit gets one terminal row;
// ASK and REFUSE are counted separately, never silently turned into passes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ts, topLevelFunctions } from '../common.mjs';
import { runPair } from '../exec/run.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`missing ${name} value`);
  return argv[i + 1];
};
const positive = (name, fallback) => {
  const value = Number(option(name, fallback));
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
};
const n = positive('--n', 30), seed = positive('--seed', 1), jobs = positive('--jobs', 1);
const out = option('--out', null);
const sample = option('--sample', process.env.LEAN_SELF_PAIR_SAMPLE || null);
const sampleRoot = option('--sample-root', process.env.LEAN_SELF_PAIR_SAMPLE_ROOT || null);
const fixturesOnly = argv.includes('--fixtures-only');
const selected = process.env.LEAN_PAIRS ? new Set(process.env.LEAN_PAIRS.split(',').map(x => x.trim()).filter(Boolean)) : null;
const tasks = [], exclusions = [];
const units = (file) => [...topLevelFunctions(ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)).keys()];
const addFile = (group, name, file) => {
  for (const unit of units(file)) tasks.push({ id: `${group}/${name}/${unit}`, group, parent: file, unit, project: false });
};
const fixtures = path.join(here, 'fixtures/self-pair');
for (const file of fs.readdirSync(fixtures).filter(x => /\.tsx?$/.test(x)).sort()) addFile('fixture', file, path.join(fixtures, file));
if (!fixturesOnly) {
  const pairs = path.join(here, 'pairs');
  const names = fs.readdirSync(pairs).filter(name => fs.statSync(path.join(pairs, name)).isDirectory()).sort();
  if (selected) for (const name of selected) if (!names.includes(name)) throw new Error(`unknown LEAN_PAIRS name: ${name}`);
  for (const name of names.filter(name => !selected || selected.has(name))) {
    const dir = path.join(pairs, name);
    const parents = ['parent.ts', 'parent.tsx'].map(file => path.join(dir, file)).filter(file => fs.existsSync(file));
    // Candidate-only tests can name additional parent files. Their absent parent
    // is an explicit exclusion: there is no parent/parent equality question.
    const expect = JSON.parse(fs.readFileSync(path.join(dir, 'expect.json'), 'utf8'));
    for (const row of expect.candidateOnly ?? []) if (row.parent) {
      const file = path.resolve(dir, row.parent);
      if (fs.existsSync(file) && !parents.includes(file)) parents.push(file);
    }
    if (!parents.length) exclusions.push({ id: `pair/${name}`, reason: 'no parent source (candidate-only pair)' });
    for (const file of parents) addFile('pair', `${name}/${path.basename(file)}`, file);
  }
  if (sample) {
    const rows = JSON.parse(fs.readFileSync(sample, 'utf8')).runs;
    if (!rows || typeof rows !== 'object') throw new Error('sample must contain runs');
    // Read paths as data, never execute the recorded shell command. Explicit
    // --sample-root allows this historical manifest to run on another checkout.
    const flag = (command, key) => {
      const tokens = command.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
      const i = tokens.indexOf(key);
      return i < 0 ? null : tokens[i + 1]?.replace(/^(["'])(.*)\1$/, '$2');
    };
    for (const [id, row] of Object.entries(rows)) {
      const recordedParent = flag(row.command ?? '', '--parent');
      const parent = sampleRoot ? path.resolve(sampleRoot, row.file) : recordedParent;
      if (!parent || !path.isAbsolute(parent)) throw new Error(`sample ${id}: missing absolute parent path`);
      let project = flag(row.command ?? '', '--project') ?? true;
      if (sampleRoot && typeof project === 'string' && recordedParent?.endsWith(row.file)) {
        const oldRoot = recordedParent.slice(0, -row.file.length);
        if (project.startsWith(oldRoot)) project = path.resolve(sampleRoot, project.slice(oldRoot.length));
      }
      tasks.push({ id: `sample/${id}`, group: 'sample', parent, unit: row.unit, project });
    }
  }
}
if (!tasks.length) throw new Error('no self-pair tasks');
if (new Set(tasks.map(t => t.id)).size !== tasks.length) throw new Error('duplicate self-pair task IDs');
const manifest = { n, seed, jobs, sample, sampleIncluded: !fixturesOnly && !!sample, selectedPairs: selected ? [...selected] : null, exclusions, tasks };
if (argv.includes('--list')) { console.log(JSON.stringify(manifest, null, 1)); process.exit(0); }
const rows = tasks.map(task => ({ ...task, status: 'pending' }));
const snapshot = () => {
  const counts = {};
  for (const row of rows) counts[row.status] = (counts[row.status] ?? 0) + 1;
  return { ...manifest, tasks: undefined, rows, counts, ok: rows.every(row => ['PASS-bounded', 'PASS-decided', 'ASK', 'REFUSE'].includes(row.status)) && rows.filter(row => row.group === 'fixture').every(row => row.status === 'PASS-bounded') };
};
// Replace a complete snapshot only after its successor was fully written. A disk
// failure still exits nonzero, while the preceding manifest remains recoverable.
const save = () => {
  if (!out) return;
  fs.writeFileSync(out + '.next', JSON.stringify(snapshot(), null, 1));
  fs.renameSync(out + '.next', out);
};
save(); // the full task list exists before dispatch; interrupted tasks stay visible
let cursor = 0;
async function worker() {
  for (;;) {
    const i = cursor++;
    if (i >= tasks.length) return;
    const task = tasks[i]; rows[i].status = 'running'; save();
    const started = performance.now();
    try {
      if (!fs.existsSync(task.parent)) throw new Error(`missing source: ${task.parent}`);
      const result = await runPair({ parent: task.parent, candidate: task.parent, unit: task.unit, project: task.project, n, seed });
      rows[i] = { ...task, status: result.verdict ?? 'NO-VERDICT', reason: result.reason ?? null, seconds: (performance.now() - started) / 1000,
        ...(result.verdict === 'WITNESS' ? { result } : {}) };
    } catch (e) {
      console.error(e.stack ?? e);
      rows[i] = { ...task, status: 'ERROR', reason: String(e.message ?? e), seconds: (performance.now() - started) / 1000 };
    }
    save(); console.log(`${task.id}: ${rows[i].status}${rows[i].reason ? ': ' + rows[i].reason : ''}`);
  }
}
await Promise.all(Array.from({ length: jobs }, worker));
const result = snapshot();
console.log(`| SELF-PAIR TOTAL | ${rows.length} units | ${result.ok ? 'NO WITNESS' : 'FAIL'} | ${JSON.stringify(result.counts)} | sample ${result.sampleIncluded ? 'included' : 'not supplied'} | ${exclusions.length} no-parent exclusions |`);
process.exit(result.ok ? 0 : 1);
