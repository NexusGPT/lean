// The url fake's protocol against Node's url (design/w2b-node-fakes.md). `--break`: the recording proxy alone answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import nodeUrl from 'node:url';
import { world, moduleOf } from './protocol.mjs';

const URLS = ['https://example.com/a/b?x=1#h', 'http://user:pw@host:8080/p', 'file:///app/x.ts', 'https://xn--bcher-kva.example/', 'mailto:a@b.c'];
test('parse-format-roundtrip: URL, URLSearchParams, format, fileURLToPath as Node', () => {
  const env = world(1); const url = moduleOf(env, 'node:url');
  for (const u of URLS) {
    const mine = new url.URL(u), theirs = new URL(u);
    assert.equal(mine.href, theirs.href); assert.equal(mine.pathname, theirs.pathname); assert.equal(mine.search, theirs.search);
    assert.equal(url.format(mine), nodeUrl.format(theirs));
    assert.equal(url.URL.canParse(u), URL.canParse(u));
  }
  assert.equal(new url.URLSearchParams('a=1&b=2').get('b'), '2');
  assert.equal(url.fileURLToPath('file:///app/x.ts'), '/app/x.ts');
  assert.throws(() => new url.URL('not a url'), TypeError);
});
test('pathToFileURL resolves a relative path against the fake working directory', () => {
  const env = world(1); const url = moduleOf(env, 'url');
  assert.equal(url.pathToFileURL('src/a.ts').href, 'file:///app/src/a.ts');
  assert.equal(url.pathToFileURL('/abs/b c.ts').href, nodeUrl.pathToFileURL('/abs/b c.ts').href);
});
