# Census report

Use `--report <md>` to write a Markdown report. The default is no report.
Use `--depth N` to fold directories. The default is 2.
Depth 0 puts every unit in the root row, named `.`.
Depth must be a nonnegative integer.
The existing root, `--out`, `--limit`, and `--include` arguments still apply.

The JSON and report use one census result from one walk.
The report renderer reads no source files and does not lint again.
The header gives the root basename, UTC date, units, inside count, share, refused count, and unreadable files.
It also gives the top five rules by units stopped.
Each rule has a total and a table with directory, units stopped, and example.
An example contains the relative file, the first finding line, and its code text.
Whitespace in the text becomes a single space. The text stops at 120 characters.
When the lint supplies no text, the example uses the source line already loaded for that file.
HTML characters and table separators are escaped.

Each refused unit belongs to its first finding that stops it.
Environment findings do not stop a unit. Findings outside a unit do not stop one either.
This follows the existing census definition of a refused unit.
Rules sort by units stopped, then by rule name. Directories sort by name.
A directory is the file parent, folded to the first N levels relative to the root.
The example keeps its full relative file path even when its directory is folded.

The JSON adds `date`, `depth`, `refused`, and `refusalRules`.
Each refusal rule has `rule`, `units`, and `directories`.
Each directory has `directory`, `units`, and `example` with `file`, `line`, and `code`.
Saved findings also retain `env` for independent counting.
The existing `rules` counts remain unchanged. They can count a unit under more than one rule.
Use `refusalRules` for totals that partition the refused units.

For each rule, the directory counts sum to its total.
The rule totals sum to `refused`.
The refused count plus `entered` equals `units`.
Unreadable files remain separate because their units are unknown.
A clean report states that no units were refused.
An empty census has a null JSON share and displays `n/a` in the report.

## Evidence

The fixture lives at `/Users/assem/nexus/nexus-organisation/work/lean-lanes/census-report/langs/ts/tests/fixtures/census-report`.
It has eight source files in three directories and the root.
The suite copies it with `fs.mkdtempSync` because the census skips paths under tests or fixtures.
It checks all three equalities against JSON from the same command.
It also checks first rule attribution, examples, header fields, directory folding, and a clean result.
The section is last among the test sections, before the summary and process exit.

The recorded fixture copy is `/tmp/claude-501/census-tree-InkP9L`.
The command ran from `/Users/assem/nexus/nexus-organisation/work/lean-lanes/census-report`:

```sh
node langs/ts/census.mjs /tmp/claude-501/census-tree-InkP9L --out /tmp/claude-501/census-report.json --report /tmp/claude-501/census-report.md
```

The log is `/tmp/claude-501/census-report.log`.
It records eight units, two inside, six refused, a 25 percent share, and no unreadable files.
Each of the three rules has two directory rows with one unit each.
Thus each rule has `1 + 1 = 2`, all rules have `2 + 2 + 2 = 6`, and `6 + 2 = 8`.
The unit in the nested var file also triggers reference equality. It belongs only to var in the report.

The isolated suite section passes in `/tmp/claude-501/census-report-section.log`.
The scratch mutant is `/tmp/claude-501/census-report-mutant.mjs`.
Its imports point to the original modules. Its only behavior change drops the var directory grouping:

```js
for (const d of r.directories.filter(() => r.rule !== 'var')) {
```

The same suite section fails in `/tmp/claude-501/census-report-red.log`.
The first equality reports `var: 0 = 2`. The process exits 1.
The scratch runner resolves its script path because macOS maps `/tmp` to `/private/tmp`.
The initial path setup failure is retained in `/tmp/claude-501/census-report-red-setup.log`.

The required regression log is `/tmp/claude-501/census-report-pairs.log`.
The single background run used `LEAN_PAIRS=recursion,inline_callee node langs/ts/tests/run.mjs`.
It records `| TOTAL | 569 checks | ALL PASS |` and `EXIT 0`.
All five census rows pass in that run.
