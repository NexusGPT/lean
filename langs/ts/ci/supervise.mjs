// This process owns terminal states; the checker supplies immutable completion candidates only.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
const hash = text => createHash('sha256').update(text).digest('hex');
export const taskId = (file, unit, caller = false) => hash(JSON.stringify([file, unit, caller]));
export function atomicJSON(file, value) {
  const temp = `${file}.${randomUUID()}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(temp, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 1)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temp, file);
  const dir = fs.openSync(path.dirname(file), 'r');
  try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
}
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const taskIndexes = new Map();
const taskIndex = dir => {
  if (!taskIndexes.has(dir)) taskIndexes.set(dir, new Map(read(path.join(dir, 'tasks.json')).tasks.map(t => [t.id, t])));
  return taskIndexes.get(dir);
};
export function createRun(root, ledger, tasks) {
  fs.mkdirSync(root, { recursive: true });
  const dir = fs.mkdtempSync(path.join(path.resolve(root), 'run-'));
  atomicJSON(path.join(dir, 'change.json'), ledger);
  const records = tasks.map(task => {
    const attemptId = randomUUID(), folder = path.join(dir, 'attempts', attemptId);
    fs.mkdirSync(folder, { recursive: true });
    atomicJSON(path.join(folder, 'attempt.json'), { task: task.id, attemptId, state: 'planned', lanes: task.lanes });
    return { ...task, attemptId, folder };
  });
  atomicJSON(path.join(dir, 'tasks.json'), { change: ledger.id, tasks: records });
  return dir;
}
export function registerTask(dir, task) {
  const manifest = read(path.join(dir, 'tasks.json'));
  if (manifest.tasks.some(t => t.id === task.id)) return manifest.tasks.find(t => t.id === task.id);
  const attemptId = randomUUID(), folder = path.join(dir, 'attempts', attemptId);
  fs.mkdirSync(folder, { recursive: true });
  const record = { ...task, attemptId, folder };
  atomicJSON(path.join(folder, 'attempt.json'), { task: task.id, attemptId, state: 'planned', lanes: task.lanes });
  manifest.tasks.push(record);
  taskIndexes.delete(dir);
  atomicJSON(path.join(dir, 'tasks.json'), manifest);
  return record;
}
export function startTask(dir, id) {
  const t = taskIndex(dir).get(id);
  if (!t) throw new Error('unregistered task');
  atomicJSON(path.join(t.folder, 'attempt.json'), { task: id, attemptId: t.attemptId, state: 'started', workerPid: process.pid, started: new Date().toISOString(), lanes: t.lanes });
}
export function commitArtifact(dir, id, row) {
  const task = taskIndex(dir).get(id);
  if (!task) throw new Error('completion for unregistered task');
  const output = path.join(task.folder, 'row.json');
  if (fs.existsSync(output)) throw new Error('attempt already has an artifact');
  atomicJSON(output, row);
  const artifact = { path: output, sha256: hash(fs.readFileSync(output)) };
  // The receipt follows the fsynced artifact. It is a candidate, not a terminal status.
  atomicJSON(path.join(task.folder, 'completion.json'), { task: id, attemptId: task.attemptId, artifact });
  return artifact;
}
export function reconcileTasks(dir, failure = { state: 'lost-worker' }) {
  if (fs.existsSync(path.join(dir, 'terminal.json'))) return read(path.join(dir, 'terminal.json'));
  const manifest = read(path.join(dir, 'tasks.json')), ledger = read(path.join(dir, 'change.json'));
  const expected = manifest.tasks.map(t => t.id);
  if (new Set(expected).size !== expected.length) throw new Error('duplicate task identity');
  const rows = [], tasks = [];
  for (const task of manifest.tasks) {
    let row, artifact, state = failure.state;
    try {
      const completion = read(path.join(task.folder, 'completion.json'));
      const target = path.join(task.folder, 'row.json');
      if (completion.task !== task.id || completion.attemptId !== task.attemptId || completion.artifact.path !== target) throw new Error('invalid completion identity');
      if (hash(fs.readFileSync(target)) !== completion.artifact.sha256) throw new Error('artifact hash mismatch');
      row = read(target);
      if (row.file !== task.file || row.unit !== task.unit || !Array.isArray(row.lines) || !row.coverage || row.coverage === 'pending') throw new Error('incomplete row');
      artifact = completion.artifact; state = 'done';
    } catch (e) {
      if (e.code !== 'ENOENT') state = 'incomplete-artifact';
      row = { file: task.file, unit: task.unit, lines: task.lines, editIds: task.editIds ?? [], caller: task.caller ?? false, verdict: 'ASK', coverage: `failed:${state}`, reason: state, advice: [] };
      const output = path.join(task.folder, 'terminal-row.json'); atomicJSON(output, row);
      artifact = { path: output, sha256: hash(fs.readFileSync(output)) };
    }
    const lanes = Object.fromEntries((task.lanes ?? []).map(lane => [lane, state !== 'done' ? state : row.certificate?.lanes?.[lane] || row[`lane${lane}`] ? 'done' : 'not-run']));
    const terminal = { id: task.id, attemptId: task.attemptId, state, artifact, lanes, ...(state !== 'done' ? { worker: failure } : {}) };
    atomicJSON(path.join(task.folder, 'terminal.json'), terminal);
    tasks.push(terminal); if (!row.omitFromReport) rows.push(row);
  }
  const terminal = tasks.map(t => t.id), missing = expected.filter(id => !terminal.includes(id)), unexpected = terminal.filter(id => !expected.includes(id));
  const laneIds = manifest.tasks.flatMap(t => (t.lanes ?? []).map(l => `${t.id}/${l}`));
  const terminalLanes = tasks.flatMap(t => Object.keys(t.lanes).map(l => `${t.id}/${l}`));
  const reconciliation = { expected, terminal, missing, unexpected, lanes: { expected: laneIds, terminal: terminalLanes, complete: laneIds.length === terminalLanes.length && laneIds.every(id => terminalLanes.includes(id)) }, complete: !missing.length && !unexpected.length && new Set(terminal).size === terminal.length };
  const result = { schema: 'lean/terminal-ledger/v1', run: dir, state: tasks.every(t => t.state === 'done') ? 'done' : failure.state, ledger, tasks, rows, reconciliation };
  // Reports are projections of this file. No report writer can remove these outcomes.
  atomicJSON(path.join(dir, 'terminal.json'), result);
  return result;
}
export async function supervise(dir, { command, args, timeoutMs, env = process.env, cwd = dir }) {
  const stdout = fs.openSync(path.join(dir, 'worker.stdout.log'), 'wx'), stderr = fs.openSync(path.join(dir, 'worker.stderr.log'), 'wx');
  let child, timedOut = false;
  const outcome = await new Promise(resolve => {
    child = spawn(command, args, { cwd, env, stdio: ['ignore', stdout, stderr] });
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    child.once('spawn', () => atomicJSON(path.join(dir, 'worker.json'), { pid: child.pid, started: new Date().toISOString(), deadline: new Date(Date.now() + timeoutMs).toISOString(), timeoutMs }));
    child.once('error', e => { clearTimeout(timer); resolve({ state: 'lost-worker', error: e.code }); });
    child.once('exit', (code, signal) => { clearTimeout(timer); resolve({ state: timedOut ? 'timeout' : code === 0 ? 'incomplete-artifact' : 'crash', exit: code, signal }); });
  });
  fs.closeSync(stdout); fs.closeSync(stderr);
  atomicJSON(path.join(dir, 'worker-exit.json'), outcome);
  const err = fs.readFileSync(path.join(dir, 'worker.stderr.log'), 'utf8');
  if (err) process.stderr.write(err);
  if (outcome.exit !== 0) console.error(`lean worker: ${outcome.state}; exit ${outcome.exit ?? 'none'}; signal ${outcome.signal ?? 'none'}; ${dir}`);
  return reconcileTasks(dir, outcome);
}

// Materialize only tracked source/configuration files, from the requested tree, inside the private run.
// The checkout is read-only; package installations are never performed. A node_modules link is read-only input.
export function materializeSources({ repo, head, dir, sensitivePath }) {
  const runGit = args => {
    const r = spawnSync('git', ['-C', repo, ...args], { maxBuffer: 1 << 28 });
    if (r.status !== 0) throw new Error(`snapshot git exit ${r.status}: ${r.stderr}`);
    return r.stdout;
  };
  const tree = head === 'WORKTREE' ? 'HEAD' : head;
  const entries = runGit(['ls-tree', '-r', '-z', tree]).toString().split('\0').filter(Boolean).map(line => {
    const tab = line.indexOf('\t'), [mode, type, oid] = line.slice(0, tab).split(' '); return { mode, type, oid, file: line.slice(tab + 1) };
  }).filter(e => e.type === 'blob' && /^100/.test(e.mode) && !sensitivePath(e.file)
    && (/\.[cm]?[jt]sx?$/.test(e.file) || /(?:^|\/)(?:package|tsconfig[^/]*)\.json$/.test(e.file) || e.file === '.lean/values.json'));
  fs.mkdirSync(dir, { recursive: true });
  if (head === 'WORKTREE') {
    for (const e of entries) {
      const src = path.join(repo, e.file);
      if (!fs.existsSync(src) || !fs.lstatSync(src).isFile()) continue;
      const target = path.join(dir, e.file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(src, target);
    }
  } else if (entries.length) {
    const r = spawnSync('git', ['-C', repo, 'cat-file', '--batch'], { input: entries.map(e => e.oid).join('\n') + '\n', maxBuffer: 1 << 30 });
    if (r.status !== 0) throw new Error(`snapshot cat-file exit ${r.status}: ${r.stderr}`);
    let pos = 0;
    for (const e of entries) {
      const end = r.stdout.indexOf(10, pos), header = r.stdout.subarray(pos, end).toString().split(' '), size = Number(header[2]);
      if (header[0] !== e.oid || header[1] !== 'blob' || !Number.isSafeInteger(size)) throw new Error('invalid snapshot blob');
      const target = path.join(dir, e.file); fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, r.stdout.subarray(end + 1, end + 1 + size)); pos = end + size + 2;
    }
  }
  for (const parent of new Set(['', ...entries.filter(e => /(?:^|\/)package\.json$/.test(e.file)).map(e => path.dirname(e.file))])) {
    const modules = path.join(repo, parent, 'node_modules'), target = path.join(dir, parent, 'node_modules');
    if (fs.existsSync(modules) && !fs.existsSync(target)) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.symlinkSync(modules, target, 'dir'); }
  }
  return dir;
}
