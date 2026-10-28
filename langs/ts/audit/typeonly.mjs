import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {parse} from '@babel/parser';import {auditDir} from './schema.mjs';
const r=JSON.parse(fs.readFileSync(auditDir+'reconciliation.json')),out=[];
for(const root of r.roots)for(const f of root.fileRecords.filter(f=>f.tsUnmatched.length)){
 const ast=parse(fs.readFileSync(path.join(root.root,f.file),'utf8'),{sourceType:'unambiguous',plugins:['typescript']});const stack=[ast];
 while(stack.length){const n=stack.pop();if(!n||typeof n!=='object')continue;for(const t of f.tsUnmatched)if(n.start===t.start&&n.end===t.end){assert.equal(n.type,'TSMethodSignature');assert.equal(n.kind,'get');out.push({root:root.root,file:f.file,tsKind:t.kind,babelKind:n.type,babelMemberKind:n.kind,start:n.start,end:n.end,category:'parser dialect difference',reason:'interface getter signature is GetAccessor in TypeScript, TSMethodSignature in Babel; already in separate Babel type-only count'});}for(const v of Object.values(n)){if(Array.isArray(v))stack.push(...v.filter(x=>x?.type));else if(v?.type)stack.push(v);}}
}
assert.equal(out.length,r.roots.reduce((n,root)=>n+root.fileRecords.reduce((m,f)=>m+f.tsUnmatched.length,0),0));
fs.writeFileSync(auditDir+'type-only-differences.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({typeOnlyRepresentationDifferences:out.length}));
