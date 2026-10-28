import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {parse as babelParse} from '@babel/parser';
import {ts,topLevelFunctions} from '../common.mjs';
import {auditDir} from './schema.mjs';
import {occurrences,fieldOf,parse,listing} from './fixtures.mjs';
const fixtures=JSON.parse(fs.readFileSync(auditDir+'fixtures.json'));
const cells=JSON.parse(fs.readFileSync(auditDir+'cells.json')),byId=new Map(cells.map(c=>[c.id,c]));
export function rawOccurrences(sf){const out=[],seen=new Set();function walk(n){if(!n||typeof n!=='object'||seen.has(n))return;seen.add(n);if(typeof n.kind!=='number')return;out.push(n);for(const [key,value]of Object.entries(n)){if(['parent','original','symbol','locals','flowNode','emitNode'].includes(key))continue;if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object'&&value.parent===n)walk(value);}}walk(sf);return out;}
const challenge=[];
for(const f of fixtures){
 const c=byId.get(f.cell),sf=ts.createSourceFile('x.'+f.language.toLowerCase(),f.source,ts.ScriptTarget.Latest,true,ts.ScriptKind[f.language]);
 const raw=rawOccurrences(sf),visited=occurrences(sf);assert.deepEqual(new Set(visited),new Set(raw));
 assert(raw.some(n=>n.kind===ts.SyntaxKind[c.kind]&&n.parent?.kind===ts.SyntaxKind[c.parent]&&fieldOf(n)===c.field&&n.getStart(sf)===f.start&&n.end===f.end));
 try{babelParse(f.source,{sourceType:f.goal,plugins:[...(['TS','TSX'].includes(f.language)?['typescript']:[]),...(['TSX','JSX'].includes(f.language)?['jsx']:[]),'decorators-legacy']});}catch(e){challenge.push({cell:f.cell,reason:e.reasonCode,message:e.message});}
}
// Finite grammar: a seed statement program in block, ordinary function body, or arrow block body.
// Enumerate ALL words of wrapper choices of length 0..3, retaining rejected parses.
const wrappers=[s=>`{${s}}`,s=>`function outer(){${s}}`,s=>`const outer = () => {${s}};`];
const paths=[[]];for(let depth=1;depth<=3;depth++)for(const prefix of paths.filter(p=>p.length===depth-1))for(let i=0;i<wrappers.length;i++)paths.push([...prefix,i]);
let attempts=0,accepted=0,rejected=0,listed=0,unlisted=0;const digest=crypto.createHash('sha256'),byDepth={};
for(const f of fixtures){
 // Strip only the artificial module sentinel; keep source-owned exports so nesting rejects are recorded.
 const source=f.goal==='module'?f.source.replace(/^export \{\};\n/,''):f.source;
 for(const word of paths){const body=word.reduce((s,i)=>wrappers[i](s),source),sf=parse(body,f);attempts++;const d=byDepth[word.length]??={attempts:0,accepted:0,rejected:0};d.attempts++;
  if(sf.parseDiagnostics.length){rejected++;d.rejected++;digest.update(f.cell+word+'rejected\n');continue;}
  accepted++;d.accepted++;assert.deepEqual(new Set(occurrences(sf)),new Set(rawOccurrences(sf)));
  const units=listing(sf),fn=occurrences(sf).filter(n=>ts.isFunctionLike(n)||n.kind===ts.SyntaxKind.JSDocSignature);
  for(const n of fn){if(units.has(n))listed++;else unlisted++;}
  digest.update(JSON.stringify([f.cell,word,fn.map(n=>[n.kind,n.getStart(sf),n.end,units.has(n)])]));
 }
}
assert.equal(attempts,fixtures.length*paths.length);assert.equal(attempts,accepted+rejected);
const result={grammar:'block | function-body | arrow-block-body; all wrapper words length 0..3 per feasible seed; parse acceptance only, not semantic validity',paths:paths.length,attempts,accepted,rejected,listedOccurrences:listed,unlistedOccurrences:unlisted,byDepth,sha256:digest.digest('hex'),babelChallenges:challenge};
fs.writeFileSync(auditDir+'bounded.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,babelChallenges:challenge.length}));
for(const c of challenge)console.log(JSON.stringify(c));
