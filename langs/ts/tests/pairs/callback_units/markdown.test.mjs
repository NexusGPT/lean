import assert from 'node:assert/strict';
import { test } from 'node:test';
import { markdown, intakeMarkdown } from '../../../pr.mjs';
test('PR renders source identities in one table cell without changing the stored name', () => {
  const unit = "outer/call(\n  `a|b`\n).then()#0";
  const row = { file: 'source.ts', unit, lines: [1, 4], verdict: 'PASS-proved', coverage: 'checked', 'covered-by': unit + '/owner' };
  for (const render of [rows => markdown(rows, 'base', 'head'), intakeMarkdown]) {
    const text = render([row]);
    const line = text.split('\n').find(l => l.startsWith('| source.ts |') || l.startsWith('| `source.ts` |'));
    assert.ok(line.includes('\\n'), text);
    assert.ok(line.includes('&#124;'), text);
    assert.equal(line.split('|').length, render === intakeMarkdown ? 7 : 9, text);
  }
  assert.equal(row.unit, unit);
  assert.match(markdown([{ ...row, unit: 'plain', 'covered-by': null }], 'base', 'head'), /\| `plain` \(1-4\) \|/);
});
