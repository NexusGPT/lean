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
      if (oldBytes?.includes(0) || newBytes?.includes(0)) { file.kind = 'binary'; add({ kind: file.kind }); continue; }
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
      if (status === 'R' || oldMode !== newMode || !file.edits.length) add({ kind: file.kind === 'text' ? 'metadata' : file.kind });
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
  const missing = expected.filter(x => !actual.includes(x)), unexpected = actual.filter(x => !expected.includes(x));
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
      const sf = ts.createSourceFile((side === 'old' ? file.oldPath : file.newPath) ?? file.file, text, ts.ScriptTarget.Latest, true);
      readings[side] = sf;
      file.units[side] = [...topLevelFunctions(sf).values()].map(u => ({ name: u.name, side, file: file.file,
        start: sf.getLineAndCharacterOfPosition(u.node.getStart(sf)).line + 1,
        end: sf.getLineAndCharacterOfPosition(u.node.getEnd()).line + 1,
        offset: u.node.getStart(sf), stop: u.node.getEnd(), id: id([file.id, side, u.name, u.node.pos, u.node.end]) }));
      const diagnostics = sf.parseDiagnostics.map(d => ({ code: d.code, start: d.start, length: d.length }));
      if (diagnostics.length) (file.parseFailures ??= {})[side] = diagnostics;
    }
    for (const edit of manifest.edits.filter(e => e.fileId === file.id)) {
      edit.links = [];
      if (edit.kind !== 'text') {
        edit.primary = edit.kind === 'failure' ? { kind: 'unassigned', reason: edit.reason } : { kind: 'artifact', reason: edit.kind === 'redacted' ? 'secret-path' : edit.kind, class: file.class };
        continue;
      }
      const side = edit.side, span = edit[side], sf = readings[side];
      const touched = file.units[side].filter(u => u.start <= span.start && span.start <= u.end);
      edit.links = touched.map(u => ({ id: u.id, file: file.file, unit: u.name, side, start: u.start, end: u.end }));
      const syntax = sf ? syntaxContext(sf, span.start) : { reason: 'non-source', parent: null };
      edit.context = syntax;
      const untyped = /\.[cm]?jsx?$/.test(file.file) && !/@(?:type|param|returns?|typedef)\s*\{/.test(sf?.text ?? '');
      if (file.parseFailures?.[side]) edit.primary = { kind: 'unassigned', reason: 'parse-failure', side };
      else if (file.class !== 'source') edit.primary = { kind: 'artifact', reason: file.class, class: file.class };
      else if (untyped) edit.primary = { kind: 'unassigned', reason: 'untyped JavaScript file', context: syntax.reason, side };
      else if (touched.length) {
        // Stable smallest-containing-unit choice; secondary links retain every touched unit.
        const primary = touched.slice().sort((a, b) => (a.stop - a.offset) - (b.stop - b.offset) || a.id.localeCompare(b.id))[0];
        edit.primary = { kind: 'unit', id: primary.id, file: file.file, unit: primary.name, side, start: primary.start, end: primary.end };
      } else edit.primary = { kind: 'unassigned', reason: syntax.reason, parent: syntax.parent, side };
    }
  }
  manifest.reconciliation = reconcileEdits(manifest);
  return manifest;
}

function syntaxContext(sf, line) {
  const starts = sf.getLineStarts(), start = starts[line - 1] ?? sf.text.length, end = starts[line] ?? sf.text.length;
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, sf.languageVariant, sf.text, undefined, start, end - start);
  let token, meaningful = false, comments = false;
  while ((token = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) comments = true;
    else if (token > ts.SyntaxKind.LastTriviaToken) meaningful = true;
  }
  if (!meaningful) return { reason: comments ? 'comment' : 'whitespace', parent: 'SourceFile' };
  const candidates = [];
  const visit = n => {
    if (n.end <= start || n.getStart(sf) >= end) return;
    if (n.parent && ts.isObjectLiteralExpression(n.parent) && (ts.isMethodDeclaration(n) || ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n) || ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n))) candidates.push({ reason: 'object-literal member', node: n, priority: 0 });
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && /^(?:module\.exports|exports)(?:\.|\[|$)/.test(n.left.getText(sf))) candidates.push({ reason: 'exported property assignment', node: n, priority: 1 });
    if (ts.isPropertyDeclaration(n)) candidates.push({ reason: 'class field', node: n, priority: 0 });
    if (ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n) || (ts.isImportDeclaration(n) && n.importClause?.isTypeOnly) || (ts.isExportDeclaration(n) && n.isTypeOnly)) candidates.push({ reason: 'type-only', node: n, priority: 0 });
    if (n.parent === sf) candidates.push({ reason: 'module-level statement', node: n, priority: 2 });
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(sf, visit);
  const c = candidates.sort((a, b) => a.priority - b.priority || (a.node.end - a.node.pos) - (b.node.end - b.node.pos))[0];
  return { reason: c?.reason ?? 'module-level statement', parent: c ? ts.SyntaxKind[c.node.parent.kind] : 'SourceFile', node: c ? ts.SyntaxKind[c.node.kind] : 'SourceFile' };
}

export function ledgerRows(manifest) {
  return manifest.edits.filter(e => e.primary.kind !== 'unit').map(e => ({
    file: e.file, unit: `(edit ${e.id.slice(0, 12)})`, editIds: [e.id], lines: [Math.max(1, e[e.side ?? 'new']?.start ?? 1), Math.max(1, e[e.side ?? 'new']?.start ?? 1)],
    verdict: 'ASK', decision: e.primary.kind, coverage: `${e.primary.kind}:${e.primary.reason}`,
    reason: e.primary.reason + (e.primary.context ? ` (${e.primary.context})` : ''), context: e.context, advice: [],
  }));
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
