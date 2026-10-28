import fs from 'node:fs';import assert from 'node:assert/strict';
const r=JSON.parse(fs.readFileSync(new URL('reconciliation.json',import.meta.url)));
assert.equal(r.roots.length,3);
for(const root of r.roots){assert.equal(root.lean,root.common+root.leanOnly);assert.equal(root.babel,root.common+root.babelOnly);assert.equal(root.files,root.fileRecords.length);assert(root.fileRecords.every(f=>f.sha256&&f.babelStatus&&f.tsStatus));}
for(const stratum of ['lean-only','babel-only']){const rows=r.samples.filter(r=>r.stratum===stratum);const available=r.roots.reduce((n,r)=>n+r[stratum==='lean-only'?'leanOnly':'babelOnly'],0);assert.equal(rows.length,Math.min(50,available));}
console.log(JSON.stringify(r.roots.map(({fileRecords,...x})=>x)));
