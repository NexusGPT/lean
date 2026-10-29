// The version-control frame exists before parsing or unit admission. No source text is persisted.
import fs from 'node:fs';
import { ts, topLevelFunctions } from '../common.mjs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const hash = value => createHash('sha256').update(value).digest('hex');
const id = value => hash(JSON.stringify(value));
const git = (repo, args) => {
  const r = spawnSync('git', ['-C', repo, ...args], { maxBuffer: 1 << 28, env: { ...process.env, LC_ALL: 'C' } });
  if (r.status !== 0) throw new Error(`git ledger: exit ${r.status}: ${r.stderr.toString().trim()}`);
  return r.stdout;
};
export const sensitivePath = file => file.split(/[\\/]/).some(p => /^(?:\.env(?:\..*)?|\.npmrc|\.netrc|id_rsa.*)$|\.(?:pem|key|p12|pfx|jks)$/i.test(p));

export function artifactClass(file, text = '') {
  const p = file.toLowerCase();
  if (/(^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|cargo\.lock|poetry\.lock|.*\.lock)$/.test(p)) return 'lockfile';
  if (/(^|\/)(?:generated|__generated__|dist|vendor)\//.test(p) || /(?:@generated|code generated .*do not edit)/i.test(text.slice(0, 2048))) return 'generated';
  if (/schema|\.(?:graphql|proto|avsc)$/.test(p)) return 'schema';
  if (/(^|\/)(?:test|tests|__tests__|spec|specs)\/|\.(?:test|spec)\.[^.]+$/.test(p)) return 'test';
  if (/(^|\/)(?:docs?|readme|license|changelog)(?:[./]|$)|\.(?:md|rst|txt)$/.test(p)) return 'doc';
  if (/(^|\/)(?:makefile|dockerfile|cmakelists\.txt)|(^|\/)(?:build|scripts)\/|\.(?:sh|bat|ps1)$/.test(p)) return 'build';
  if (/(^|\/)(?:\.[^/]+|package\.json|tsconfig[^/]*|.*config[^/]*)$|\.(?:ya?ml|toml|ini)$/.test(p)) return 'config';
  if (/\.(?:json|csv|tsv|xml|sql)$/.test(p)) return 'data';
  if (/\.(?:[cm]?[jt]sx?)$/.test(p)) return 'source';
  return 'non-source';
}

const zero = oid => /^0+$/.test(oid);
// Git's NUL-delimited raw format keeps spaces, tabs, newlines and rename pairs unambiguous.
export function buildChangeManifest({ repo, base, head = 'WORKTREE' }) {
  const before = git(repo, ['rev-parse', '--verify', `${base}^{commit}`]).toString().trim();
  const after = head === 'WORKTREE' ? head : git(repo, ['rev-parse', '--verify', `${head}^{commit}`]).toString().trim();
  const refs = [before, ...(after === 'WORKTREE' ? [] : [after])];
  const raw = git(repo, ['diff', '--no-ext-diff', '--no-textconv', '--raw', '--no-abbrev', '-z', '-M', ...refs, '--']).toString().split('\0');
  // numstat prints `-\t-` for every path git itself treats as binary, including a `.gitattributes` -diff/binary path.
  const numstat = git(repo, ['diff', '--no-ext-diff', '--no-textconv', '--numstat', '-z', '-M', ...refs, '--']).toString().split('\0');
  const gitBinary = new Set();
  for (let i = 0; i < numstat.length && numstat[i];) {
    const m = numstat[i++].match(/^(-|\d+)\t(-|\d+)\t(.*)$/s);
    if (!m) throw new Error('unrecognized git numstat record');
    const names = m[3] ? [m[3]] : [numstat[i++], numstat[i++]];
    if (m[1] === '-' && m[2] === '-') for (const n of names) gitBinary.add(n);
  }
  const files = [], edits = [], sources = new Map();
  for (let i = 0; i < raw.length && raw[i];) {
    const match = raw[i++].match(/^:(\d+) (\d+) ([a-f0-9]+) ([a-f0-9]+) ([A-Z])(\d*)$/);
    if (!match) throw new Error('unrecognized git raw record');
    const [, oldMode, newMode, oldOid, newOid, status, similarity] = match;
    const oldName = raw[i++], newName = status === 'R' || status === 'C' ? raw[i++] : oldName;
    const file = { id: id([before, after, oldName, newName, oldMode, newMode, oldOid, newOid]), file: newName,
      oldPath: status === 'A' ? null : oldName, newPath: status === 'D' ? null : newName,
      oldMode, newMode, oldOid, newOid, status, ...(similarity ? { similarity: Number(similarity) } : {}), edits: [], hunks: [] };
    const add = (record) => {
      const edit = { id: id([file.id, file.edits.length, record]), fileId: file.id, file: file.file, class: file.class, ...record };
      file.edits.push(edit.id); edits.push(edit);
    };
    files.push(file);
    file.class = artifactClass(newName);
    try {
      if (sensitivePath(oldName) || sensitivePath(newName)) { file.kind = 'redacted'; add({ kind: file.kind, reason: 'secret-path' }); continue; }
      if (oldMode === '160000' || newMode === '160000') { file.kind = 'submodule'; add({ kind: file.kind }); continue; }
      // A symlink is an artifact: never follow it into a file outside the requested snapshot.
      if (oldMode === '120000' || newMode === '120000') { file.kind = 'symlink'; add({ kind: file.kind }); continue; }
      const oldBytes = zero(oldOid) ? null : git(repo, ['cat-file', 'blob', oldOid]);
      const newBytes = status === 'D' ? null : after === 'WORKTREE' ? fs.readFileSync(path.join(repo, newName)) : git(repo, ['cat-file', 'blob', newOid]);
      file.oldHash = oldBytes === null ? null : hash(oldBytes); file.newHash = newBytes === null ? null : hash(newBytes);
      if (after === 'WORKTREE') file.id = id([file.id, file.oldHash, file.newHash]);
      if (gitBinary.has(newName) || gitBinary.has(oldName) || oldBytes?.includes(0) || newBytes?.includes(0)) { file.kind = 'binary'; add({ kind: file.kind }); continue; }
      const oldText = oldBytes?.toString('utf8') ?? null, newText = newBytes?.toString('utf8') ?? null;
      sources.set(file.id, { old: oldText, new: newText });
      file.class = artifactClass(newName, newText ?? oldText ?? '');
      file.kind = status === 'A' ? 'added' : status === 'D' ? 'deleted' : status === 'R' ? 'rename/move' : file.oldHash === file.newHash && oldMode !== newMode ? 'mode-only' : 'text';
      // Diff by paths against the same trees; no textconv, external diff, or repository diff driver is executed.
      const patch = git(repo, ['diff', '--no-ext-diff', '--no-textconv', '--unified=0', '--no-color', '-M', ...refs, '--', oldName, ...(oldName === newName ? [] : [newName])]).toString();
      for (const h of patch.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)) {
        const oldSpan = { start: +h[1], count: +(h[2] ?? 1) }, newSpan = { start: +h[3], count: +(h[4] ?? 1) };
        const hunk = { id: id([file.id, oldSpan, newSpan]), old: oldSpan, new: newSpan };
        file.hunks.push(hunk);
        // Lines are the atomic intervals of this ledger. Deletions and additions keep independent snapshot ownership.
        for (const [side, span] of [['old', oldSpan], ['new', newSpan]]) for (let line = span.start; line < span.start + span.count; line++) {
          add({ kind: 'text', hunkId: hunk.id, side, old: side === 'old' ? { start: line, count: 1 } : { start: oldSpan.start, count: 0 }, new: side === 'new' ? { start: line, count: 1 } : { start: newSpan.start, count: 0 } });
        }
      }
      if (status === 'R' || (!zero(oldMode) && !zero(newMode) && oldMode !== newMode) || !file.edits.length) add({ kind: file.kind === 'text' ? 'metadata' : file.kind });
    } catch (e) {
      file.kind ??= 'unreadable'; file.error = e.code ?? e.name;
      add({ kind: 'failure', reason: 'read-failure' });
    }
  }
  const manifest = { schema: 'lean/change-ledger/v1', base: before, head: after, files, edits };
  manifest.id = id([before, after, files.map(f => [f.id, f.oldHash, f.newHash])]);
  Object.defineProperty(manifest, 'sources', { value: sources });
  return manifest;
}

export function reconcileEdits(manifest) {
  const expected = manifest.files.flatMap(f => f.edits), actual = manifest.edits.map(e => e.id);
  if (new Set(actual).size !== actual.length || new Set(expected).size !== expected.length) throw new Error('duplicate edit identity');
  const buckets = { unit: [], artifact: [], unassigned: [] }, classes = {};
  for (const e of manifest.edits) {
    if (!buckets[e.primary?.kind]) throw new Error(`edit without primary route: ${e.id}`);
    buckets[e.primary.kind].push(e.id);
    (classes[e.class] ??= { unit: [], artifact: [], unassigned: [] })[e.primary.kind].push(e.id);
  }
  const expectedSet = new Set(expected), actualSet = new Set(actual);
  const missing = expected.filter(x => !actualSet.has(x)), unexpected = actual.filter(x => !expectedSet.has(x));
  return { expected, ...buckets, classes, missing, unexpected, complete: !missing.length && !unexpected.length };
}

// Syntax is evidence attached to an existing edit, never the condition for registering it.
export function routeChanges(manifest) {
  for (const file of manifest.files) {
    file.units = { old: [], new: [] };
    const readings = {};
    for (const side of ['old', 'new']) {
      const text = manifest.sources.get(file.id)?.[side];
      if (text == null || !/\.[cm]?[jt]sx?$/.test(file.file)) continue;
      // A parser or lister exception (e.g. stack exhaustion on deep nesting) is a record on this side, never a lost change.
      let sf;
      try {
        sf = ts.createSourceFile((side === 'old' ? file.oldPath : file.newPath) ?? file.file, text, ts.ScriptTarget.Latest, true);
        file.units[side] = [...topLevelFunctions(sf).values()].map(u => ({ name: u.name, side, file: file.file,
          start: sf.getLineAndCharacterOfPosition(u.node.getStart(sf)).line + 1,
          end: sf.getLineAndCharacterOfPosition(u.node.getEnd()).line + 1,
          offset: u.node.getStart(sf), stop: u.node.getEnd(), id: id([file.id, side, u.name, u.node.pos, u.node.end]) }));
      } catch (e) {
        file.units[side] = [];
        (file.parseFailures ??= {})[side] = [{ exception: e.name, message: String(e.message).slice(0, 120) }];
        continue;
      }
      readings[side] = sf;
      const diagnostics = sf.parseDiagnostics.map(d => ({ code: d.code, start: d.start, length: d.length }));
      // Recoverable diagnostics leave a complete tree (TypeScript always builds one); they are evidence, never a route
      // on their own: a diagnostic elsewhere in the file must not hide a changed function the checker can still read.
      if (diagnostics.length) (file.parseDiagnostics ??= {})[side] = diagnostics;
    }
    // Split an edited line at unit and top-level statement boundaries. A line containing both
    // a function and a module-level mutation must retain both obligations.
    const expanded = [];
    for (const edit of manifest.edits.filter(e => e.fileId === file.id)) {
      const sf = readings[edit.side];
      if (edit.kind !== 'text' || !sf || file.parseFailures?.[edit.side]) { expanded.push(edit); continue; }
      const starts = sf.getLineStarts(), begin = starts[edit[edit.side].start - 1], end = starts[edit[edit.side].start] ?? sf.text.length;
      const boundaries = [...new Set([begin, end, ...file.units[edit.side].flatMap(u => [u.offset, u.stop]), ...sf.statements.flatMap(n => [n.getStart(sf), n.end])].filter(p => p >= begin && p <= end))].sort((a, b) => a - b);
      const spans = [];
      for (let i = 0; i < boundaries.length - 1; i++) {
        const a = boundaries[i], b = boundaries[i + 1];
        if (!sf.text.slice(a, b).trim() && spans.length) spans[spans.length - 1][1] = b;
        else if (!sf.text.slice(a, b).trim() && i < boundaries.length - 2) boundaries[i + 1] = a;
        else spans.push([a, b]);
      }
      for (const [start, stop] of spans) expanded.push({ ...edit, id: spans.length === 1 ? edit.id : id([edit.id, start, stop]), offsets: { start, end: stop } });
    }
    manifest.edits = manifest.edits.filter(e => e.fileId !== file.id).concat(expanded);
    file.edits = expanded.map(e => e.id);
    for (const edit of expanded) {
      edit.links = [];
      if (edit.kind !== 'text') {
        edit.primary = edit.kind === 'failure' ? { kind: 'unassigned', reason: edit.reason } : { kind: 'artifact', reason: edit.kind === 'redacted' ? 'secret-path' : edit.kind, class: file.class };
        continue;
      }
      const side = edit.side, span = edit[side], sf = readings[side];
      const touched = file.units[side].filter(u => edit.offsets ? u.offset < edit.offsets.end && edit.offsets.start < u.stop : u.start <= span.start && span.start <= u.end);
      edit.links = touched.map(u => ({ id: u.id, file: file.file, unit: u.name, side, start: u.start, end: u.end }));
      let syntax;
      try { syntax = file.parseFailures?.[side] ? { reason: 'parse-failure', parent: null } : sf ? syntaxContext(sf, span.start, edit.offsets) : { reason: 'non-source', parent: null }; }
      catch (e) { syntax = { reason: 'syntax-context-failure', parent: null, exception: e.name }; }
      edit.context = syntax;
      const untyped = /\.[cm]?jsx?$/.test(file.file) && !/@(?:type|param|returns?|typedef)\s*\{/.test(sf?.text ?? '');
      // Order: a parser exception (no tree on that side), a diagnostic inside the edit (its own syntax is not trustworthy,
      // nor a unit listed over it), a listed unit (the checker reads it, whatever the path's class or language), an edit
      // outside every unit of an untyped JavaScript file, the artifact class of a file with no touched unit, the named
      // syntactic context.
      // A diagnostic inside the edited span: this edit's own syntax is not trustworthy.
      const starts = sf?.getLineStarts(), from = edit.offsets?.start ?? starts?.[span.start - 1], to = edit.offsets?.end ?? starts?.[span.start] ?? sf?.text.length;
      const local = (file.parseDiagnostics?.[side] ?? []).filter(d => d.start < to && from < d.start + Math.max(1, d.length));
      if (local.length) edit.diagnostics = local.map(d => d.code);
      if (file.parseFailures?.[side]) edit.primary = { kind: 'unassigned', reason: 'parse-failure', side };
      else if (local.length) edit.primary = { kind: 'unassigned', reason: 'parse-failure', codes: edit.diagnostics, side };
      else if (touched.length) {
        // Stable smallest-containing-unit choice; secondary links retain every touched unit. A listed unit owns its edit
        // whatever the file's language: a JavaScript unit is listed and, when untyped, refused by name (untyped-js).
        const primary = touched.slice().sort((a, b) => (a.stop - a.offset) - (b.stop - b.offset) || a.id.localeCompare(b.id))[0];
        edit.primary = { kind: 'unit', id: primary.id, file: file.file, unit: primary.name, side, start: primary.start, end: primary.end };
      } else if (untyped) edit.primary = { kind: 'unassigned', reason: 'untyped JavaScript file', context: syntax.reason, side }; // an edit outside every listed unit of an untyped JavaScript file
      else if (file.class !== 'source') edit.primary = { kind: 'artifact', reason: file.class, class: file.class };
      else edit.primary = { kind: 'unassigned', reason: syntax.reason, parent: syntax.parent, side };
    }
  }
  manifest.reconciliation = reconcileEdits(manifest);
  return manifest;
}

function syntaxContext(sf, line, offsets) {
  const starts = sf.getLineStarts(), start = offsets?.start ?? starts[line - 1] ?? sf.text.length, end = offsets?.end ?? starts[line] ?? sf.text.length;
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, sf.languageVariant, sf.text, undefined, start, end - start);
  let token, meaningful = false, comments = false;
  while ((token = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) comments = true;
    else if (token > ts.SyntaxKind.LastTriviaToken) meaningful = true;
  }
  if (!meaningful) return { reason: comments ? 'comment' : 'whitespace', parent: 'SourceFile' };
  const candidates = [];
  // An explicit stack: a 10,000-term expression must not exhaust the call stack.
  const stack = [];
  ts.forEachChild(sf, c => { stack.push(c); });
  const visit = n => {
    if (n.end <= start || n.getStart(sf) >= end) return;
    if (n.parent && ts.isObjectLiteralExpression(n.parent) && (ts.isMethodDeclaration(n) || ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n) || ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n))) candidates.push({ reason: 'object-literal member', node: n, priority: 0 });
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && /^(?:module\.exports|exports)(?:\.|\[|$)/.test(n.left.getText(sf))) candidates.push({ reason: 'exported property assignment', node: n, priority: 1 });
    if (ts.isPropertyDeclaration(n)) candidates.push({ reason: 'class field', node: n, priority: 0 });
    if (ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n) || (ts.isImportDeclaration(n) && n.importClause?.isTypeOnly) || (ts.isExportDeclaration(n) && n.isTypeOnly)) candidates.push({ reason: 'type-only', node: n, priority: 0 });
    if (n.parent === sf) candidates.push({ reason: 'module-level statement', node: n, priority: 2 });
    ts.forEachChild(n, c => { stack.push(c); });
  };
  while (stack.length) visit(stack.pop());
  const c = candidates.sort((a, b) => a.priority - b.priority || (a.node.end - a.node.pos) - (b.node.end - b.node.pos))[0];
  return { reason: c?.reason ?? 'module-level statement', parent: c ? ts.SyntaxKind[c.node.parent.kind] : 'SourceFile', node: c ? ts.SyntaxKind[c.node.kind] : 'SourceFile' };
}

// One ASK row per (file, hunk, route): a 3,000-line lockfile hunk is one row naming 3,000 edit identities, not 3,000 rows.
// Every edit identity stays on exactly one row, so the rows still reconcile to the ledger edit by edit. A row is named by
// its first edit identity: two groups of one hunk (same route, different context) never share a task identity.
export function ledgerRows(manifest) {
  const groups = new Map();
  for (const e of manifest.edits) {
    if (e.primary.kind === 'unit') continue;
    const key = JSON.stringify([e.file, e.hunkId ?? e.id, e.primary.kind, e.primary.reason, e.primary.context ?? null]);
    const line = Math.max(1, e[e.side ?? 'new']?.start ?? 1);
    const g = groups.get(key);
    if (g) { g.editIds.push(e.id); g.lines = [Math.min(g.lines[0], line), Math.max(g.lines[1], line)]; continue; }
    groups.set(key, { file: e.file, unit: `(edits from ${e.id.slice(0, 12)} ${e.primary.kind}:${e.primary.reason})`, editIds: [e.id], lines: [line, line],
      verdict: 'ASK', decision: e.primary.kind, coverage: `${e.primary.kind}:${e.primary.reason}`,
      reason: e.primary.reason + (e.primary.context ? ` (${e.primary.context})` : ''), context: e.context, advice: [] });
  }
  return [...groups.values()];
}

export function ledgerMarkdown(manifest) {
  if (!manifest) return '';
  const escape = v => String(v ?? '').replace(/[|\r\n`]/g, ' ');
  const r = reconcileEdits(manifest);
  const lines = ['## Change ledger', '', `Edit reconciliation: ${r.expected.length} = ${r.unit.length} unit + ${r.artifact.length} artifact + ${r.unassigned.length} unassigned; identities ${r.complete ? 'complete' : 'INCOMPLETE'}.`, '', '| edit | file | kind | old span | new span | primary | secondary units |', '|---|---|---|---|---|---|---|'];
  for (const e of manifest.edits) lines.push(`| ${e.id} | ${escape(e.file)} | ${e.kind} | ${e.old ? `${e.old.start}+${e.old.count}` : ''} | ${e.new ? `${e.new.start}+${e.new.count}` : ''} | ${escape(e.primary.kind + ': ' + (e.primary.unit ?? e.primary.reason))} | ${e.links.map(u => escape(u.side + ':' + u.unit)).join(', ')} |`);
  for (const [cls, sets] of Object.entries(r.classes)) lines.push('', `${cls}: ${JSON.stringify(sets)}`);
  return lines.join('\n');
}
