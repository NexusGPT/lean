// The version-control frame exists before parsing or unit admission. No source text is persisted.
import fs from 'node:fs';
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
