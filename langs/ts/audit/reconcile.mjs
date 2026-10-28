import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {parse as babelParse} from '@babel/parser';
import {ts,topLevelFunctions} from '../common.mjs';
import {auditDir} from './schema.mjs';
import {occurrences,fieldOf} from './fixtures.mjs';
const W='/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3';
const preferred=W+'/census/repos/nexus';
const roots=[{name:'nexus',root:fs.existsSync(preferred)?preferred:W+'/work/bench/nexus/tree'},{name:'langchainjs',root:W+'/census/repos/langchainjs'},{name:'agent-nexus',root:W+'/census/repos/agent-nexus'}];
// Exact census.mjs exclusions; directory entries that are symlinks are never followed.
const SKIP_DIR=new Set(['node_modules','dist','build','.next','coverage','.git','out','generated','__generated__','storybook-static','vendor','.turbo']);
const SKIP_FILE=/\.(test|spec|stories|d|e2e|cy)\.(ts|tsx|mts)$|(^|\/)(tests?|__tests__|__mocks__|e2e|fixtures?|__fixtures__|stories|cypress|playwright)(\/|$)/;
function* walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,e.name);if(e.isSymbolicLink())continue;if(e.isDirectory()){if(!SKIP_DIR.has(e.name)&&!e.name.startsWith('.'))yield*walk(p);}else if(e.isFile()&&/\.(ts|tsx|mts)$/.test(e.name)&&!SKIP_FILE.test(p))yield p;}}
const names=new Map();for(const [name,value]of Object.entries(ts.SyntaxKind))if(typeof value==='number'&&!/^(First|Last)/.test(name)&&!names.has(value))names.set(value,name);
const kindName=k=>names.get(k);
const mapping={FunctionDeclaration:'FunctionDeclaration',FunctionExpression:'FunctionExpression',ArrowFunctionExpression:'ArrowFunction',TSDeclareFunction:'FunctionDeclaration'};
const typeOnly=new Set(['TSCallSignatureDeclaration','TSConstructSignatureDeclaration','TSMethodSignature','TSIndexSignature','TSFunctionType','TSConstructorType']);
function kind(n){if(mapping[n.type])return mapping[n.type];if(['ObjectMethod','ClassMethod','ClassPrivateMethod','TSDeclareMethod'].includes(n.type))return ({get:'GetAccessor',set:'SetAccessor',constructor:'Constructor'})[n.kind]??'MethodDeclaration';return null;}
function enumerate(ast){const out=[],types=[],stack=[ast];while(stack.length){const n=stack.pop();if(!n||typeof n!=='object')continue;if(kind(n))out.push({node:n,kind:kind(n),start:n.start,end:n.end});if(typeOnly.has(n.type))types.push({kind:n.type,start:n.start,end:n.end});for(const [k,v]of Object.entries(n)){if(['loc','tokens','comments','errors'].includes(k))continue;if(Array.isArray(v))for(const x of v)if(x?.type)stack.push(x);else {}else if(v?.type)stack.push(v);}}return {out,types};}
const key=n=>[n.start,n.end,n.kind].join(':'), hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const tsRuntime=new Set(['FunctionDeclaration','FunctionExpression','ArrowFunction','MethodDeclaration','Constructor','GetAccessor','SetAccessor'].map(x=>ts.SyntaxKind[x]));
const summaries=[],allDiffs=[];
for(const root of roots){
 const R={...root,files:0,lean:0,babel:0,common:0,leanOnly:0,babelOnly:0,tsAllRuntime:0,babelTypeOnly:0,tsParseFailedFiles:0,babelFailedFiles:0,babelRecoveredFiles:0,normalizedCommon:0,fileRecords:[]};
 const fd=fs.openSync(auditDir+'disagreements-'+root.name+'.jsonl','w');
 for(const file of walk(root.root)){
  const text=fs.readFileSync(file,'utf8'),relative=path.relative(root.root,file),sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const tsNodes=occurrences(sf).filter(n=>tsRuntime.has(n.kind)).map(node=>({node,kind:kindName(node.kind),start:node.getStart(sf),end:node.end}));
  const lean=[...topLevelFunctions(sf).values()].map(u=>({node:u.fn,kind:kindName(u.fn.kind),start:u.fn.getStart(sf),end:u.fn.end,name:u.name}));
  const LM=new Map(lean.map(n=>[key(n),n]));let babel=[],types=[],errors=[],babelStatus='parsed';
  try{const ast=babelParse(text,{sourceType:'unambiguous',errorRecovery:true,plugins:[['typescript',{disallowAmbiguousJSXLike:file.endsWith('.mts')}],...(file.endsWith('.tsx')?['jsx']:[]),'decorators-legacy','decoratorAutoAccessors']});({out:babel,types}=enumerate(ast));errors=ast.errors.map(e=>({reason:e.reasonCode,pos:e.pos}));if(errors.length)babelStatus='recovered';}catch(e){babelStatus='failed';errors=[{reason:e.reasonCode??e.name,pos:e.pos}];}
  const BM=new Map(babel.map(n=>[key(n),n]));const common=[...LM.keys()].filter(k=>BM.has(k)).length;
  // Auxiliary normalized count only: same kind/end and closest start. Raw strata remain unchanged.
  const normalized=new Set();const unmappedBabel=[];for(const b of babel){const candidate=tsNodes.filter(t=>t.kind===b.kind&&t.end===b.end).sort((a,c)=>Math.abs(a.start-b.start)-Math.abs(c.start-b.start))[0];if(candidate){
   const lo=Math.min(candidate.start,b.start),hi=Math.max(candidate.start,b.start);
   const prefix=text.slice(lo,hi).replace(/\b(export|default)\b/g,'').trim();
   if(!prefix)normalized.add(key(candidate));else unmappedBabel.push({kind:b.kind,start:b.start,end:b.end,reason:'different non-export prefix'});
  }else unmappedBabel.push({kind:b.kind,start:b.start,end:b.end,reason:'no TS same-kind/end'});}
  const tsUnmatched=tsNodes.filter(n=>!normalized.has(key(n))).map(n=>({kind:n.kind,start:n.start,end:n.end,parent:kindName(n.node.parent.kind),field:fieldOf(n.node),body:!!n.node.body}));
  const record={tsUnmatched,unmappedBabel,file:relative,sha256:hash(text),tsStatus:sf.parseDiagnostics.length?'parse-failed':'parsed',tsDiagnostics:sf.parseDiagnostics.map(d=>({code:d.code,start:d.start})),babelStatus,babelErrors:errors,lean:LM.size,babel:BM.size,tsAllRuntime:tsNodes.length,babelTypeOnly:types.length,common,leanOnly:LM.size-common,babelOnly:BM.size-common,normalizedCommon:[...LM.keys()].filter(k=>normalized.has(k)).length};
  R.files++;for(const k of ['lean','babel','common','leanOnly','babelOnly','tsAllRuntime','babelTypeOnly','normalizedCommon'])R[k]+=record[k];if(sf.parseDiagnostics.length)R.tsParseFailedFiles++;if(babelStatus==='failed')R.babelFailedFiles++;if(babelStatus==='recovered')R.babelRecoveredFiles++;R.fileRecords.push(record);
  for(const [stratum,M,other]of [['lean-only',LM,BM],['babel-only',BM,LM]])for(const [id,n]of M){if(other.has(id))continue;
   const t=stratum==='lean-only'?n:tsNodes.filter(t=>t.kind===n.kind&&t.end===n.end).sort((a,b)=>Math.abs(a.start-n.start)-Math.abs(b.start-n.start))[0];
   const nearbyOther=[...other.values()].filter(x=>x.kind===n.kind&&(x.end===n.end||x.start===n.start)).map(x=>({start:x.start,end:x.end,kind:x.kind}));
   const parent=t?.node.parent;const ancestors=[];for(let p=parent;p&&ancestors.length<6;p=p.parent)ancestors.push(kindName(p.kind));
   const row={root:root.name,file:relative,start:n.start,end:n.end,kind:n.kind,stratum,line:sf.getLineAndCharacterOfPosition(n.start).line+1,babelStatus,babelErrors:errors,tsStatus:record.tsStatus,tsMatch:t?{start:t.start,end:t.end,kind:t.kind,parent:parent?kindName(parent.kind):null,field:fieldOf(t.node),ancestors,body:!!t.node.body,listed:LM.has(key(t)),name:t.node.name&&ts.isIdentifier(t.node.name)?t.node.name.text:null,modifiers:t.node.modifiers?.map(m=>kindName(m.kind))??[]}:null,nearbyOther};
   // No source bodies or string values are copied into audit artifacts.
   fs.writeSync(fd,JSON.stringify(row)+'\n');allDiffs.push(row);
  }
 }
 fs.closeSync(fd);summaries.push(R);console.log(JSON.stringify({...R,fileRecords:undefined}));
}
const samples=[];for(const stratum of ['lean-only','babel-only']){const rows=allDiffs.filter(r=>r.stratum===stratum);rows.sort((a,b)=>hash(JSON.stringify([a.root,a.file,a.start,a.end,a.kind])).localeCompare(hash(JSON.stringify([b.root,b.file,b.start,b.end,b.kind]))));samples.push(...rows.slice(0,50).map((r,i)=>({...r,sampleId:stratum+':'+(i+1)})));}
const result={base:'fea80f8',typescript:ts.version,babel:'7.28.5',identity:'relative file, UTF-16 getStart/start, exclusive end, normalized function kind; lean u.fn not enclosing declaration statement',typeOnly:'separate Babel signature count; runtime strata retain bodyless TSDeclareFunction and TSDeclareMethod',roots:summaries,samples};
fs.writeFileSync(auditDir+'reconciliation.json',JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(auditDir+'samples.json',JSON.stringify(samples,null,2)+'\n');
console.log(JSON.stringify({samples:samples.length,differences:allDiffs.length}));
