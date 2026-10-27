// the editor rule on new code only: the files a repository added or changed since a boundary (a tag, a commit, a
// branch), as an ESLint flat-config entry that turns `lean/provable` on for those files and no others.
//
//   // eslint.config.mjs
//   import lean from './path/to/lean/langs/ts/eslint/index.mjs';
//   import { changedFiles, leanOnNewCode } from './path/to/lean/langs/ts/ci/new-code.mjs';
//   export default [
//     // ...the repository's own entries
//     ...leanOnNewCode(lean, { files: changedFiles({ since: 'lean-start' }) }),
//   ];
//
// The list is read when ESLint loads the config, so a file joins the moment it is created or edited: tracked
// changes since the boundary, staged or not, and untracked files git does not ignore.
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CODE = /\.(ts|tsx|mts)$/;
const git = (repo, args) => {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr.trim()}`);
  return r.stdout.split('\n').filter(Boolean);
};

// the TypeScript files changed since `since` (added: only the files created since then), relative to the repository root
export function changedFiles({ repo = process.cwd(), since, added = false } = {}) {
  if (!since) throw new Error('changedFiles needs a boundary: a tag, a commit or a branch');
  const root = git(repo, ['rev-parse', '--show-toplevel'])[0];
  const tracked = git(root, ['diff', '--name-only', '--no-renames', `--diff-filter=${added ? 'A' : 'AM'}`, since]);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard']);
  return [...new Set([...tracked, ...untracked])].filter((f) => CODE.test(f)).sort();
}

// one flat-config entry with the rule on for exactly these files; none when the list is empty (ESLint refuses an
// empty `files`). `project` is passed to the rule as is: a tsconfig path, true for the nearest, false for none.
export function leanOnNewCode(plugin, { files, level = 'error', project } = {}) {
  if (!plugin?.rules?.provable) throw new Error('pass the lean ESLint plugin (langs/ts/eslint/index.mjs)');
  const list = (files ?? []).map((f) => f.split(path.sep).join('/'));
  if (!list.length) return [];
  return [{ name: 'lean/new-code', files: list, plugins: { lean: plugin }, rules: { 'lean/provable': project === undefined ? level : [level, { project }] } }];
}
