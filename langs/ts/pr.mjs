#!/usr/bin/env node
// lean pr: a whole change at once. Give it a checkout and two git refs (the base and the head of a pull request, or
// a commit and its parent); it finds every changed function, runs both lanes on each, and prints one report:
// a verdict per function with its certificate pointer, and for every ASK the lint's advice on what to change.
// An unchanged caller of a changed function gets a row too when lane B finds a WITNESS through that callee.
//
//   node pr.mjs --repo <checkout> --base <ref> [--head <ref|WORKTREE>] [--preview] [--out report.md] [--json report.json]
//               [--time-budget seconds] [--unit-budget n] [--reuse] [--fresh] [--cache-dir <dir>]
//               [--n 100] [--dafny-seconds 30] [--project <tsconfig>|--no-project] [--adapters scope.json]
//
// A changed signature proves only through an adapter the developer declares: the scope door (`--adapters`, a scope
// file whose "adapters" maps a Dafny function name to {from, to, map}) or the comment door (`// lean-adapter {...}`
// just above the candidate function, read by check.mjs from the head file). Without one it stays ASK:interface.
//
// How it reads the two versions without a second checkout: the head version is the file in the checkout (or the
// head ref's content written beside it); the base version is `git show base:path` written beside the file under a
// dotted name, so its imports resolve exactly as the real file's do. Both temporary files are removed at the end.
// Source files are restored and nothing is committed. The cache retains checked evidence.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ts, loadProgram, topLevelFunctions } from './common.mjs';
import { check } from './check.mjs';
import { lintFile } from './lint/lint.mjs';
import { formatOp } from './patch.mjs';
import { runPair } from './exec/run.mjs';
import { callersOf, calleesOf } from './exec/callees.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const git = (repo, args) => { const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }); if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr.trim()}`); return r.stdout; };
const CODE = /\.(ts|tsx|mts|cts)$/;
const JS = /\.(js|jsx|mjs|cjs)$/;

const hash = (value) => createHash('sha256').update(value).digest('hex');
const fileHash = (file) => hash(fs.readFileSync(file));

// Sort object keys so an adapter's property order does not change its meaning.
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;

export function runIdentity({ base, head, unitSet, leanVersion, libraryTableHash, adviceTableHash, dafnyVersion }) {
  return hash(JSON.stringify(canonical({ base, head, unitSet: [...unitSet].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), leanVersion, libraryTableHash, adviceTableHash, dafnyVersion })));
}

export function unitKey({ parentText, candidateText, calleeSummaries, fileContext, imports, tsconfig, flags }) {
  return hash(JSON.stringify(canonical({ parentText, candidateText, calleeSummaries, fileContext, imports, tsconfig, flags })));
}

function runTools() {
  const version = spawnSync('dafny', ['--version'], { encoding: 'utf8', timeout: 20000 });
  if (version.error && version.error.code !== 'ENOENT') throw version.error;
  if (!version.error && version.status !== 0) throw new Error('Dafny version failed: ' + version.stderr);
  return {
    leanVersion: git(here, ['rev-parse', 'HEAD']).trim(),
    libraryTableHash: fileHash(process.env.LEAN_LIBRARY_TABLE || path.join(here, 'translate/library.json')),
    adviceTableHash: fileHash(path.join(here, 'lint/advice.mjs')),
    dafnyVersion: version.error?.code === 'ENOENT' ? 'absent' : version.stdout.trim(),
  };
}

function keySide(file, unit, loaded, project, repo, readingAlreadyLoaded) {
  if (!file) return { text: null, callees: [], fileContext: null, imports: [], tsconfig: null };
  if (!loaded.has(file)) {
    const reading = readingAlreadyLoaded ?? loadProgram(file, { project });
    const { sf, program, projectFile } = reading;
    const imports = [...new Set(ts.preProcessFile(sf.text, true, true).importedFiles.map((entry) => entry.fileName))].sort().map((specifier) => {
      const resolved = ts.resolveModuleName(specifier, file, program.getCompilerOptions(), ts.sys).resolvedModule;
      if (!resolved || resolved.isExternalLibraryImport) return { specifier };
      const relative = path.relative(path.resolve(repo), path.resolve(resolved.resolvedFileName));
      if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || secretPath(relative)
        || relative.split(path.sep).includes('node_modules')) return { specifier };
      return { specifier, file: relative, sha256: fileHash(resolved.resolvedFileName) };
    });
    const spans = [...topLevelFunctions(sf).values()].map(({ node }) => [node.getFullStart(), node.getEnd()]).sort((a, b) => a[0] - b[0]);
    let outside = '', end = 0;
    for (const [start, stop] of spans) { outside += sf.text.slice(end, start); end = stop; }
    outside += sf.text.slice(end);
    loaded.set(file, { ...reading, fileContext: hash(outside), imports, tsconfig: projectFile && fs.existsSync(projectFile) ? fileHash(projectFile) : null });
  }
  const { sf, checker, fileContext, imports, tsconfig } = loaded.get(file), units = topLevelFunctions(sf);
  const textOf = (name) => units.get(name)?.node.getFullText(sf) ?? null;
  return { text: textOf(unit), callees: calleesOf(sf, checker, unit).map(({ callee }) => ({ callee, text: textOf(callee) })).sort((a, b) => a.callee.localeCompare(b.callee)), fileContext, imports, tsconfig };
}

function readCache(file, key, context) {
  try {
    const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (record.key === key && record.context === context && record.row?.coverage === 'checked'
      && record.row.certificate?.identity && record.row.certificate.verdict === record.row.verdict
      && record.row.certificate.unit === record.row.unit) return record.row;
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Cache read ignored: ' + (e.code ?? e.name));
  }
  return null;
}

function writeCache(file, record) {
  const temporary = file + '.' + process.pid + '.tmp';
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(temporary, JSON.stringify(record, null, 1));
    fs.renameSync(temporary, file);
  } catch (e) {
    console.error('Cache write ignored: ' + (e.code ?? e.name));
  } finally { fs.rmSync(temporary, { force: true }); }
}

// Only names are inspected. Secret contents never enter the change set.
export function secretPath(file) {
  return file.split(/[\\/]/).some((part) => /^(?:\.env(?:\..*)?|id_rsa.*)$|\.(?:pem|key|p12|pfx|jks)$/i.test(part));
}

// The caller supplies file metadata, units and lint findings.
// This function performs no IO and never runs a lane.
export function selectUnits(changedFiles, opts = {}) {
  return changedFiles.flatMap((file) => {
    if (opts.paths && !opts.paths(file.file)) return [];
    const stub = { file: file.file, name: '(file)', start: 1, end: 1 };
    const skipped = (reason) => [{ unit: stub, decision: 'skipped', reason }];
    if (secretPath(file.file)) return skipped('secret-path');
    if (file.binary) return skipped('binary');
    if (JS.test(file.file) && !file.hasTypes) return skipped('not-typescript');
    if (!CODE.test(file.file) && !(JS.test(file.file) && file.hasTypes)) return [];
    if (file.error) return (file.units?.length ? file.units.map((u) => ({ ...u, file: file.file })) : [stub]).map((unit) => ({ unit, decision: 'failed', reason: 'loader' }));
    return (file.units ?? []).map((u) => ({
      unit: { ...u, file: file.file },
      decision: u.error ? 'failed' : u.findings?.length ? 'refused' : 'check',
      reason: u.error ? 'harness' : u.findings?.[0]?.rule ?? 'selected for checking',
    }));
  });
}

function changedRanges(repo, base, head, rel, deleted) {
  const out = git(repo, ['diff', '--no-ext-diff', '--no-textconv', '--unified=0', '--no-color', '--no-renames', base, ...(head === 'WORKTREE' ? [] : [head]), '--', rel]);
  return [...out.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)].map((m) => {
    const start = Number(m[deleted ? 1 : 3]), count = Number(m[deleted ? 2 : 4] ?? 1);
    return [start, Math.max(start, start + count - 1)];
  });
}

function changedUnits(loaded, ranges, file) {
  const { sf } = loaded;
  return [...topLevelFunctions(sf).values()].flatMap((u) => {
    const start = sf.getLineAndCharacterOfPosition(u.node.getStart(sf)).line + 1;
    const end = sf.getLineAndCharacterOfPosition(u.node.getEnd()).line + 1;
    if (!ranges.some(([a, b]) => a <= end && start <= b)) return [];
    try { return [{ name: u.name, start, end, findings: loaded.checker ? lintFile(file, [[start, end]], { loaded }) : [] }]; }
    catch (e) { return [{ name: u.name, start, end, error: String(e.message).slice(0, 300) }]; }
  });
}

// Read the change set before selection. Files outside code and secret names need no contents.
function changedFiles(opts, temps) {
  const { repo, base, head = 'WORKTREE', filesRoot, project = true } = opts;
  const refs = [base, ...(head === 'WORKTREE' ? [] : [head])];
  const names = git(repo, ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--name-only', '-z', ...refs, '--']).split('\0').filter(Boolean);
  const stats = git(repo, ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--numstat', '-z', ...refs, '--']);
  const binary = new Set(stats.split('\0').filter((x) => x.startsWith('-\t-\t')).map((x) => x.slice(4)));
  return names.map((rel) => {
    const entry = { file: rel, binary: binary.has(rel) };
    if (secretPath(rel) || entry.binary || (!CODE.test(rel) && !JS.test(rel))) return entry;
    const abs = path.join(filesRoot ?? repo, rel);
    const readRef = (ref) => {
      const r = spawnSync('git', ['-C', repo, 'show', `${ref}:${rel}`], { maxBuffer: 1 << 28 });
      if (r.status === 0) return r.stdout;
      if (!/does not exist|exists on disk, but not in/.test(String(r.stderr))) throw new Error(String(r.stderr));
      return null;
    };
    try {
      const original = readRef(base);
      const current = head === 'WORKTREE' ? (fs.existsSync(abs) ? fs.readFileSync(abs) : null) : readRef(head);
      entry.deleted = current === null;
      const bytes = current ?? original;
      if (!bytes) throw new Error('No readable side');
      if (bytes.includes(0)) return { ...entry, binary: true };
      const text = bytes.toString('utf8');
      entry.hasTypes = JS.test(rel) && /@(?:type|param|returns?|typedef)\s*\{/.test(text);
      if (JS.test(rel) && !entry.hasTypes) return entry;
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      // A unique folder would change relative import resolution. Keep temporary siblings.
      const temporary = (side, content) => {
        const p = path.join(path.dirname(abs), `.lean_${side}_${process.pid}_${path.basename(abs)}`);
        if (fs.existsSync(p)) throw new Error('Temporary source already exists');
        fs.writeFileSync(p, content); temps.push(p); return p;
      };
      entry.headFile = head === 'WORKTREE' && !entry.deleted ? abs : temporary('head', bytes);
      entry.baseFile = original ? temporary('base', original) : null;
      const ranges = changedRanges(repo, base, head, rel, entry.deleted);
      try { entry.keyReading = loadProgram(entry.headFile, { project }); entry.units = changedUnits(entry.keyReading, ranges, entry.headFile); }
      catch (e) {
        entry.error = String(e.message).slice(0, 300);
        entry.units = changedUnits({ sf: ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true) }, ranges, entry.headFile);
      }
    } catch (e) { entry.error = String(e.message).slice(0, 300); }
    return entry;
  });
}

export function coverageOf(result) {
  const lanes = result.certificate?.lanes ?? {};
  if (['WITNESS', 'PASS-proved', 'PASS-decided', 'PASS-bounded', 'NEW', 'IN-SCOPE'].includes(result.verdict)) return 'checked';
  const reason = lanes.B?.reason ?? result.reason ?? '';
  if (lanes.B?.kind === 'load' || /load failed:/.test(reason)) return 'failed:loader';
  if (/\btimeout\b|__timeout__/.test(reason)) return 'failed:timeout';
  if (lanes.B?.verdict === 'ASK:harness' || /^harness:/.test(reason)) return 'failed:harness';
  if (lanes.A?.verdict === 'ASK:timeout') return 'failed:timeout';
  if (lanes.A?.verdict === 'ASK:translation-defect') return 'failed:translation-defect';
  return 'checked';
}

export function budgetValue(value, flag, integer = false) {
  if (value === null) return null;
  const n = Number(value);
  if (value === undefined || String(value).trim() === '' || !Number.isFinite(n) || n < 0 || (integer && !Number.isInteger(n))) {
    throw new Error(`${flag} must be a nonnegative ${integer ? 'integer' : 'number'}`);
  }
  return n;
}

export function reportJSON(rows) {
  return { identity: rows.identity, rows, order: rows.order, stop: rows.stop };
}

export function stopNote(stop) {
  return stop && stop.reason !== 'none' ? `stopped: ${stop.reason} after ${stop.reached} of ${stop.total} units` : '';
}

export async function prReport(opts) {
  const { repo, base, head = 'WORKTREE', n = 100, seed = 1, deep = false, dafnySeconds = 30, project = true, scope = new Set(), adapters = null } = opts;
  const timeBudget = budgetValue(opts.timeBudget === undefined ? null : opts.timeBudget, '--time-budget');
  const unitBudget = budgetValue(opts.unitBudget === undefined ? null : opts.unitBudget, '--unit-budget', true);
  const started = performance.now();
  const rows = [], temps = [];
  const changed = [], callers = [], heap = [];
  let callersChecked = 0;
  const cacheDir = path.resolve(opts.cacheDir ?? path.join(repo, '.lean/cache'));
  const loadedKeys = new Map();
  const toolVersions = opts.preview ? null : runTools();
  const context = toolVersions ? hash(JSON.stringify({ schema: 1, ...toolVersions })) : null;
  try {
    const files = changedFiles(opts, temps);
    const selected = selectUnits(files, opts);
    for (const entry of files) {
      const rel = entry.file;
      const intake = selected.filter((x) => x.unit.file === rel);
      const units = intake.filter((x) => x.decision === 'check' || x.decision === 'refused').map((x) => x.unit);
      for (const item of intake) {
        const u = item.unit;
        const index = rows.length;
        rows.push({ file: rel, unit: u.name, lines: [u.start, u.end], coverage: item.decision === 'check' ? 'pending' : `${item.decision}:${item.reason}`, decision: item.decision, verdict: null, reason: entry.error ?? u.error ?? item.reason, advice: [] });
        if (!opts.preview && (item.decision === 'check' || item.decision === 'refused')) changed.push({ entry, u, index });
      }
      if (opts.preview || !units.length || !entry.baseFile || entry.deleted) continue;
      const changedNames = new Set(units.map((u) => u.name));
      let loaded;
      try { loaded = loadProgram(entry.headFile, { project: false }); } catch { continue; }
      const { sf, checker } = loaded;
      const all = topLevelFunctions(sf);
      let names = [];
      try { names = callersOf(sf, checker, [...changedNames]); } catch { /* No caller runs. */ }
      for (const name of names) {
        if (changedNames.has(name) || scope.has(name) || scope.has(`${rel}:${name}`)) continue;
        const unit = all.get(name);
        if (!unit) continue;
        const start = sf.getLineAndCharacterOfPosition(unit.node.getStart(sf)).line + 1;
        const end = sf.getLineAndCharacterOfPosition(unit.node.getEnd()).line + 1;
        callers.push({ entry, u: { name, start, end }, caller: true });
      }
    }
    // The heap group stays empty until discovery supplies extra units.
    const groups = [{ group: 'changed', units: changed }, { group: 'callers', units: callers }, { group: 'heap', units: heap }];
    const order = groups.flatMap((g) => g.units);
    rows.order = groups.map(({ group, units }) => ({ group, units: units.map(({ entry, u }) => ({ file: entry.file, unit: u.name, lines: [u.start, u.end] })) }));
    if (toolVersions) rows.identity = runIdentity({ base: git(repo, ['rev-parse', base]).trim(), head: head === 'WORKTREE' ? head : git(repo, ['rev-parse', head]).trim(),
      unitSet: [...new Map([...selected.map(({ unit }) => ({ file: unit.file, unit: unit.name })), ...order.map(({ entry, u }) => ({ file: entry.file, unit: u.name }))].map((u) => [JSON.stringify(u), u])).values()], ...toolVersions });
    rows.stop = { reason: 'none', reached: 0, total: order.length };
    for (const task of order) {
      const { entry, u, caller, index } = task;
      const rel = entry.file, headFile = entry.headFile, baseFile = entry.baseFile;
      let key = null, cacheFile = null;
      const save = (row) => {
        if (row.certificate) row.certificate = { ...row.certificate, verdict: row.verdict };
        if (caller) rows.push(row); else rows[index] = row;
        if (key && row.coverage === 'checked' && row.certificate) writeCache(cacheFile, { key, context, row });
      };
      if (rows.stop.reason === 'none') {
        if (unitBudget !== null && rows.stop.reached >= unitBudget) rows.stop.reason = 'unit-budget';
        else if (timeBudget !== null && performance.now() - started >= timeBudget * 1000) rows.stop.reason = 'time-budget';
      }
      if (rows.stop.reason !== 'none') {
        save({ file: rel, unit: u.name, lines: [u.start, u.end], coverage: 'skipped:budget', verdict: null, reason: `stop at unit ${rows.stop.reached + 1} of ${rows.stop.total}`, advice: [], ...(caller ? { caller: true } : {}) });
        continue;
      }
      rows.stop.reached++;
      if (!u.findings?.length) {
        try {
          const parent = keySide(baseFile, u.name, loadedKeys, project, repo);
          const candidate = keySide(entry.deleted ? null : headFile, u.name, loadedKeys, project, repo, entry.keyReading);
          key = unitKey({ parentText: parent.text, candidateText: candidate.text,
            calleeSummaries: { parent: parent.callees, candidate: candidate.callees },
            fileContext: { parent: parent.fileContext, candidate: candidate.fileContext },
            imports: { parent: parent.imports, candidate: candidate.imports }, tsconfig: { parent: parent.tsconfig, candidate: candidate.tsconfig },
            flags: { n, seed, dafnySeconds, project, deep, scope: scope.has(u.name) || scope.has(`${rel}:${u.name}`), adapters,
              file: rel, unit: u.name, caller: !!caller } });
          cacheFile = path.join(cacheDir, key + '.json');
        } catch (e) { console.error('Cache key unavailable: ' + (e.code ?? e.name)); }
      }
      const cached = key && opts.reuse !== false && !opts.fresh ? readCache(cacheFile, key, context) : null;
      if (cached) {
        if (caller) callersChecked++;
        save({ ...cached, lines: [u.start, u.end], coverage: 'reused', verdict: cached.certificate.verdict, note: `reused from ${key.slice(0, 12)}` });
        continue;
      }
      const basicCertificate = (lanes = {}) => ({ tool: 'lean-ts v3', identity: rows.identity, unit: u.name,
        parent: { file: baseFile, sha256: baseFile ? fileHash(baseFile).slice(0, 16) : null },
        candidate: { file: entry.deleted ? null : headFile, sha256: entry.deleted ? null : fileHash(headFile).slice(0, 16) }, lanes });
      if (caller) {
        callersChecked++;
        let b = null;
        try { b = await runPair({ parent: baseFile, candidate: headFile, unit: u.name, n, seed, deep, project }); } catch { /* No witness row. */ }
        const w = b?.verdict === 'WITNESS' ? b.witnesses?.[0] : null;
        if (!w || w.where?.cause !== 'callee') continue;
        save({ file: rel, unit: u.name, lines: [u.start, u.end], verdict: 'WITNESS', coverage: 'checked', laneB: 'WITNESS', laneA: null, caller: true, certificate: basicCertificate({ B: b }), witness: { input: w.input, args: w.args, where: w.where, through: w.through, ...(Array.isArray(w.patch) ? { patch: w.patch, patchSummary: w.patchSummary } : {}) }, reason: null, advice: [] });
        continue;
      }
      if (!baseFile || entry.deleted) {
        save({ file: rel, unit: u.name, verdict: 'ASK', coverage: u.findings?.length ? `refused:${u.findings[0].rule}` : 'checked', certificate: basicCertificate(), reason: entry.deleted ? 'deleted unit: no candidate to compare with' : 'new file: no parent to compare with', lines: [u.start, u.end] });
        continue;
      }
      if (u.findings?.length) {
        let b;
        try { b = await runPair({ parent: baseFile, candidate: headFile, unit: u.name, n, seed, deep, project }); }
        catch (e) { b = { verdict: 'ASK', reason: `harness: ${String(e.message).slice(0, 300)}` }; }
        save({ file: rel, unit: u.name, lines: [u.start, u.end], coverage: `refused:${u.findings[0].rule}`, verdict: scope.has(u.name) || scope.has(`${rel}:${u.name}`) ? 'IN-SCOPE' : b.verdict, laneB: b.verdict, laneA: null, witness: b.witnesses?.[0] ?? null, reason: b.reason ?? u.findings[0].msg, advice: u.findings.slice(0, 8).map((x) => ({ line: x.line, rule: x.rule, msg: x.msg, do: x.advice })) });
        continue;
      }
      if (scope.has(u.name) || scope.has(`${rel}:${u.name}`)) {
        // declared in scope: this function was meant to change; its difference is information, not a refusal
        let result = null; try { result = await check({ parent: baseFile, candidate: headFile, unit: u.name, n, seed, deep, project, dafnySeconds: 1, identity: rows.identity }); } catch { /* keep */ }
        const b = result?.certificate?.lanes?.B ?? null;
        save({ file: rel, unit: u.name, lines: [u.start, u.end], verdict: 'IN-SCOPE', coverage: 'checked', certificate: result?.certificate ?? basicCertificate(), laneB: b?.verdict ?? null, laneA: null, witness: b?.witnesses?.[0] ?? null, reason: b?.verdict === 'WITNESS' ? 'changed as asked: the two versions differ' : b?.verdict === 'PASS-bounded' ? 'declared in scope but no difference found within the bound' : (b?.reason ?? null), advice: [] });
        continue;
      }
      let res;
      try { res = await check({ parent: baseFile, candidate: headFile, unit: u.name, n, seed, deep, project, dafnySeconds, adapters, identity: rows.identity }); }
      catch (e) { res = { verdict: 'ASK', certificate: basicCertificate({ B: { verdict: 'ASK:harness', reason: `harness: ${String(e.message).slice(0, 300)}` } }) }; }
      const lanes = res.certificate?.lanes ?? {};
      const row = { file: rel, unit: u.name, lines: [u.start, u.end], verdict: res.verdict, coverage: coverageOf(res), certificate: res.certificate, laneB: lanes.B?.verdict ?? null, laneA: lanes.A?.verdict ?? null, witness: res.witness ? { input: res.witness.input, args: res.witness.args, where: res.witness.where, ...(res.witness.through ? { through: res.witness.through } : {}), ...(Array.isArray(res.witness.patch) ? { patch: res.witness.patch, patchSummary: res.witness.patchSummary } : {}) } : null, reason: lanes.A?.detail ?? lanes.B?.reason ?? null, advice: [], ...(lanes.A?.adapter ? { adapter: lanes.A.adapter.theorem } : {}), ...(lanes.A?.restsOn?.length ? { restsOn: lanes.A.restsOn.map((x) => `${x.callee} ${x.verdict}`) } : {}) };
      if (res.verdict !== 'PASS-proved' && res.verdict !== 'WITNESS') {
        try { const f = lintFile(headFile, [[u.start, u.end]], { project }); row.advice = f.slice(0, 8).map((x) => ({ line: x.line, rule: x.rule, msg: x.msg, do: x.advice })); } catch { /* none */ }
      }
      save(row);
    }
  } finally { for (const t of temps) { try { fs.rmSync(t, { force: true }); } catch { /* Gone. */ } } }
  rows.callersChecked = callersChecked;
  return rows;
}

// the note of a WITNESS row whose difference came through a changed same-file callee (where.cause 'callee'): the callee
// by name, linked to its own row in the same table; a callee whose own row is PASS differs only on the caller's inputs,
// so the caller's row is where the reviewer looks
export function calleeNote(r, rows) {
  const names = (r.witness?.through ?? []).map((t) => t.callee);
  if (!names.length) return null;
  const own = names.map((c) => rows.find((x) => x.file === r.file && x.unit === c)?.verdict ?? null);
  const parts = names.map((c, i) => (own[i] && own[i].startsWith('PASS') ? `${c} (changed), whose own row is ${own[i]}: the difference needs the caller's inputs` : own[i] ? `${c} (changed; its own row is ${own[i]})` : `${c} (changed)`));
  return `through ${parts.join(', ')}; this function's text is unchanged`;
}

const cell = (value) => String(value ?? '').replace(/[\r\n|]/g, ' ').replace(/`/g, "'");
export function intakeMarkdown(rows) {
  const lines = ['## Intake', '', '| file | unit | coverage | decision | reason |', '|---|---|---|---|---|'];
  for (const r of rows.filter((x) => !x.caller)) lines.push(`| \`${cell(r.file)}\` | ${cell(r.unit)} | ${cell(r.coverage)} | ${cell(r.decision ?? (r.coverage === 'checked' ? 'check' : r.coverage?.split(':')[0]))} | ${cell(r.reason ?? (r.coverage === 'checked' ? 'verdict produced' : ''))} |`);
  return lines.join('\n');
}

export function markdown(rows, base, head) {
  const count = (v) => rows.filter((r) => r.verdict === v).length;
  const lines = [`# lean report: ${base} → ${head}${stopNote(rows.stop) ? '; ' + stopNote(rows.stop) : ''}`, ...(rows.identity ? ['', `Identity: ${rows.identity}`] : []), '', `${rows.filter((r) => !r.caller).length} changed function(s)${rows.callersChecked ? `; ${rows.callersChecked} unchanged caller(s) checked through lane B, ${rows.filter((r) => r.caller && r.verdict === 'WITNESS').length} with a WITNESS through a changed callee` : ''}: **${count('IN-SCOPE')} in scope · ${count('WITNESS')} WITNESS · ${count('PASS-proved')} PASS-proved · ${count('PASS-decided')} PASS-decided · ${count('PASS-bounded')} PASS-bounded · ${count('ASK')} ASK · ${count('REFUSE')} REFUSE · ${count('NEW')} NEW**`, '',
    '| file | function | verdict | coverage | lane B | lane A | note |', '|---|---|---|---|---|---|---|'];
  for (const r of rows) {
    let note = r.coverage === 'reused' ? r.note : r.verdict === 'WITNESS' && r.witness?.where?.cause === 'callee' ? `input ${r.witness?.input}: ${calleeNote(r, rows)}`.replace(/\|/g, '/') : r.verdict === 'WITNESS' ? `input ${r.witness?.input}: ${r.witness?.where ? r.witness.where.field + (r.witness.where.path ? ' ' + r.witness.where.path : '') : ''}${r.witness?.patchSummary ? '; patch: ' + String(r.witness.patchSummary).replace(/\|/g, '/') : ''}` : (r.reason ? String(r.reason).replace(/\n/g, ' ').slice(0, 90) : '');
    if (r.verdict === 'WITNESS') {
      const site = r.witness?.where?.lines?.candidate;
      if (site) {
        const source = site.file.replace(/(^|\/)\.lean_head_\d+_/, '$1');
        const file = source === r.file || source.endsWith('/' + r.file) ? r.file : source;
        const label = r.witness.where.advice?.label ?? r.advice?.find((a) => a.line === site.start)?.do?.match(/^\[(proved|conditional|migration|flag-only)(?::[^\]]*)?\]/)?.[1];
        note += `; ${file}:${site.start}${label ? ' [' + label + ']' : ''}`;
      }
    }
    if (r.verdict === 'WITNESS' && r.witness?.args) r.note = note;
    lines.push(`| ${r.file} | \`${r.unit}\` (${r.lines[0]}-${r.lines[1]}) | **${r.verdict ?? ''}** | ${r.coverage ?? ''} | ${r.laneB ?? ''} | ${r.laneA ?? ''} | ${note} |`);
  }
  const patched = rows.filter((r) => r.verdict === 'WITNESS' && r.witness?.patch?.length); // a front-end WITNESS: the first three ops of its patch, one per line
  if (patched.length) {
    lines.push('', '## What changed on the page', '');
    for (const r of patched) { lines.push(`### ${r.file} · \`${r.unit}\`: ${r.witness.patchSummary}`, ''); for (const op of r.witness.patch.slice(0, 3)) lines.push(`- \`${formatOp(op).replace(/`/g, "'")}\``); if (r.witness.patch.length > 3) lines.push(`- and ${r.witness.patch.length - 3} more op(s) in the certificate`); lines.push(''); }
  }
  const asks = rows.filter((r) => r.advice && r.advice.length);
  if (asks.length) {
    lines.push('', '## What would make the asks provable', '');
    for (const r of asks) { lines.push(`### ${r.file} · \`${r.unit}\``, ''); for (const a of r.advice) { lines.push(`- line ${a.line}, \`${a.rule}\`: ${a.msg}`); if (a.do) lines.push(`  do: ${a.do}`); } lines.push(''); }
  }
  lines.push('', 'A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.');
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const repo = path.resolve(opt('--repo', '.')); const base = opt('--base'); const head = opt('--head', 'WORKTREE');
  if (!base) { console.error('usage: pr.mjs --repo <checkout> --base <ref> [--head <ref|WORKTREE>] [--scope f,Class.m,file.ts:f] [--preview] [--out report.md] [--json report.json]'); process.exit(2); }
  const scope = new Set((opt('--scope', '') || '').split(',').map((x) => x.trim()).filter(Boolean));
  const rows = await prReport({ repo, base, head, n: Number(opt('--n', 100)), dafnySeconds: Number(opt('--dafny-seconds', 30)), project: a.includes('--no-project') ? false : opt('--project', true), scope, timeBudget: budgetValue(opt('--time-budget', null), '--time-budget'), unitBudget: budgetValue(opt('--unit-budget', null), '--unit-budget', true), reuse: !a.includes('--fresh'), fresh: a.includes('--fresh'), cacheDir: opt('--cache-dir', null) ?? undefined, filesRoot: opt('--files-root', null), preview: a.includes('--preview'), adapters: opt('--adapters') ? JSON.parse(fs.readFileSync(opt('--adapters'), 'utf8')).adapters ?? null : null });
  const md = a.includes('--preview') ? intakeMarkdown(rows) : markdown(rows, base, head);
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(a.includes('--preview') ? rows : reportJSON(rows), null, 1));
  if (opt('--out')) { fs.writeFileSync(opt('--out'), md); console.log(`${rows.length} function(s) -> ${opt('--out')}`); } else console.log(md);
}
