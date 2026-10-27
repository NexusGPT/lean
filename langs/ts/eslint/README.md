# eslint-plugin-lean

One rule, `lean/provable`. It runs lean's own lint (`langs/ts/lint/lint.mjs`) on the file inside its project and
reports every construct the proof lane refuses, at its line, with what to write instead. Three rewrites that keep the
author's meaning are offered as suggestions: `var` to `let`, `==` to `===`, a division under `Math.floor`.

The rule takes one option, `{ project }`: a tsconfig path, `true` for the nearest `tsconfig.json` (the default), or
`false` to read the file alone.

## On every file

```js
// eslint.config.mjs
import lean from './path/to/lean/langs/ts/eslint/index.mjs';
export default [lean.configs.recommended]; // lean/provable as a warning on **/*.ts, **/*.tsx, **/*.mts
```

## On new code only

Code written before the rule is on is judged by the pull-request table, not by the editor. To turn the rule on for
new code alone, fix a boundary and list the files past it. Flat config has no `overrides`: an entry whose `files`
names exactly those files does the same job, placed after the repository's own entries.

1. Mark the boundary once: `git tag lean-start` on the commit where the rule starts.
2. In the config:

```js
// eslint.config.mjs
import lean from './path/to/lean/langs/ts/eslint/index.mjs';
import { changedFiles, leanOnNewCode } from './path/to/lean/langs/ts/ci/new-code.mjs';

export default [
  // ...the repository's own entries
  ...leanOnNewCode(lean, { files: changedFiles({ since: 'lean-start' }) }),           // files added or edited since the tag
  // ...leanOnNewCode(lean, { files: changedFiles({ since: 'lean-start', added: true }) }), // or: files created since the tag
];
```

`changedFiles` reads git when ESLint loads the config: tracked files changed since the boundary, staged or not, and
untracked files git does not ignore, `.ts`, `.tsx` and `.mts` only, relative to the repository root (keep the config
at the root). `leanOnNewCode` returns one entry with `lean/provable` at `error` (pass `level: 'warn'` for a softer
start, `project` for the rule option), or nothing when no file is past the boundary, since ESLint refuses an empty
`files`.

A boundary by folder needs no helper: `{ files: ['src/next/**/*.ts'], plugins: { lean }, rules: { 'lean/provable': 'error' } }`.

## The check

ESLint is not vendored with lean, so the rule is checked the way ESLint drives it: `create(context)`, then the
`Program` visitor, with a context that records each report.

    node langs/ts/ci/new-code.test.mjs     # last line: "new-code.test: N of N checks pass"

It builds a scratch repository with a boundary tag, an untouched file, an edited file, a new file and an untracked
file; checks which files each boundary selects; checks the entry's shape and rule id; and runs the rule on a new file
(one `var` report at line 2 with its suggestion) and on a clean one (no report).

In a repository that has ESLint installed, the manual check is one command on a file past the boundary that holds a
`var`: `npx eslint <that file>` prints a `lean/provable` error naming `var`, and the same command on a file before
the boundary prints nothing from lean.
