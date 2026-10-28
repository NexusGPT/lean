// `node --test langs/ts/tests/ci/` runs this folder as one entry, which resolves to this file: it loads every
// *.test.mjs beside it, in name order, so their node:test cases run and report together.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  for (const name of fs.readdirSync(__dirname).filter((n) => n.endsWith('.test.mjs')).sort()) {
    await import(pathToFileURL(path.join(__dirname, name)).href);
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
