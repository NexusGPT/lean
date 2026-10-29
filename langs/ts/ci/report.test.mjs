import assert from 'node:assert/strict';
import { markdown } from '../pr.mjs';
const rows = [{ file: 'page.tsx', unit: 'page', lines: [1, 1], verdict: 'WITNESS', coverage: 'checked', witness: { patch: [{ kind: 'insert', after: { $el: 'p', children: 'text' } }], patchSummary: 'insert element' } }];
const before = JSON.stringify(rows);
const rendered = markdown(rows, 'base', 'head');
assert.match(rendered, /WITNESS/);
assert.match(rendered, /insert <p>"text"<\/p>/); // a string child is one text child (kidsOf): the patch prints, no fallback note
assert.doesNotMatch(rendered, /patch display unavailable/);
assert.equal(JSON.stringify(rows), before, 'rendering preserves the durable observation');
console.log('report.test: all assertions pass');
