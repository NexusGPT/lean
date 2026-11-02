// per-rule units stopped, base vs after, and the headline counts (w1e result file)
import fs from 'node:fs';
const [b, a] = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const rows = (r) => Object.fromEntries((r.refusalRules ?? []).map((x) => [x.rule, x.units]));
const rb = rows(b), ra = rows(a);
console.log(`| | base | after | delta |\n| --- | ---: | ---: | ---: |`);
for (const k of ['units', 'entered', 'environmentBlocked', 'languageRefused']) console.log(`| ${k} | ${b[k]} | ${a[k]} | ${a[k] - b[k]} |`);
console.log(`| handles (units / entered) | - | ${a.environment?.handles?.units ?? 0} / ${a.environment?.handles?.entered ?? 0} | |`);
const mine = ['this', 'implicit-this', 'static-this', 'class', 'inheritance', 'global-read', 'global-mutation', 'toplevel-state', 'toplevel-effect', 'react-handler-capture', 'hook-order', 'render-impure', 'ts-strict'];
console.log(`\n| rule | stopped base | stopped after | delta |\n| --- | ---: | ---: | ---: |`);
for (const k of mine) console.log(`| ${k} | ${rb[k] ?? 0} | ${ra[k] ?? 0} | ${(ra[k] ?? 0) - (rb[k] ?? 0)} |`);
const other = [...new Set([...Object.keys(rb), ...Object.keys(ra)])].filter((k) => !mine.includes(k) && (ra[k] ?? 0) !== (rb[k] ?? 0)).sort((x, y) => Math.abs((ra[y] ?? 0) - (rb[y] ?? 0)) - Math.abs((ra[x] ?? 0) - (rb[x] ?? 0)));
console.log(`\nother rules that moved (units newly graded reach the next rule they meet):`);
for (const k of other) console.log(`| ${k} | ${rb[k] ?? 0} | ${ra[k] ?? 0} | ${(ra[k] ?? 0) - (rb[k] ?? 0)} |`);
