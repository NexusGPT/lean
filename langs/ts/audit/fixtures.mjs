import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ts,topLevelFunctions} from '../common.mjs';
import {auditDir,modes} from './schema.mjs';
import {sources,exclusion} from './contexts.mjs';
export function occurrences(sf){const out=[],seen=new Set();function visit(n){if(seen.has(n))return;seen.add(n);out.push(n);ts.forEachChild(n,visit);for(const j of n.jsDoc??[])visit(j);}visit(sf);return out;}
export function fieldOf(n){const p=n.parent;if(!p)return null;return Object.keys(p).find(k=>k!=='parent'&&(p[k]===n||Array.isArray(p[k])&&p[k].includes(n)))??null;}
export function parse(source,c){return ts.createSourceFile('fixture.'+c.language.toLowerCase(),(c.goal==='module'?'export {};\n':'')+source,ts.ScriptTarget.Latest,true,ts.ScriptKind[c.language]);}
export function listing(sf){return new Set([...topLevelFunctions(sf).values()].map(u=>u.fn));}
if(process.argv[1]===fileURLToPath(import.meta.url)){
const schema=JSON.parse(fs.readFileSync(auditDir+'schema.json')), cells=[],fixtures=[],unresolved=[];
for(const c of schema.candidates){
 const no=exclusion(c);if(no){cells.push({...c,feasible:false,reason:no});continue;}
 let chosen;
 for(const source of sources(c)){
  const sf=parse(source,c);if(sf.parseDiagnostics.length)continue;
  const n=occurrences(sf).find(n=>n.kind===ts.SyntaxKind[c.kind]&&n.parent?.kind===ts.SyntaxKind[c.parent]&&fieldOf(n)===c.field);
  if(n){chosen={source,sf,n};break;}
 }
 if(!chosen){unresolved.push(c);cells.push({...c,feasible:null,reason:'UNRESOLVED: generator lacks a witnessed source or impossibility argument'});continue;}
 const {source,sf,n}=chosen;let verdict;try{verdict=listing(sf).has(n)?'listed':'not listed';}catch(e){verdict='crashed';}
 const fixture=fixtures.length;fixtures.push({cell:c.id,source:sf.text,language:c.language,goal:c.goal,start:n.getStart(sf),end:n.end,verdict});cells.push({...c,feasible:true,reason:'parser-accepted source witnesses exact parent field; excludes separately named early-error constraints',fixture,verdict});
}
fs.writeFileSync(auditDir+'cells.json',JSON.stringify(cells,null,2)+'\n');fs.writeFileSync(auditDir+'fixtures.json',JSON.stringify(fixtures,null,2)+'\n');
console.log(JSON.stringify({cells:cells.length,feasible:fixtures.length,unresolved:unresolved.length}));
for(const key of [...new Set(unresolved.map(c=>[c.kind,c.parent,c.field].join('|')))])console.log(key);
if(unresolved.length)process.exitCode=1;

}
