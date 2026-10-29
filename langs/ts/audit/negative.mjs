import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parse as babelParse} from '@babel/parser';
import {ts} from '../common.mjs';
import {auditDir,modes} from './schema.mjs';
import {parse,listing,occurrences} from './fixtures.mjs';
const own=[
 {partition:'pass',name:'ordinary',source:'function f(){} const g=()=>0;'},
 {partition:'pass-explicit',name:'parenthesized',source:'const f = (function(){});'},
 {partition:'fail',name:'missing-parameter-close',source:'function f( {'},
 {partition:'fail',name:'missing-arrow-body',source:'const f = () => ;'},
 {partition:'fail',name:'object-recovery',source:'const o = { f( { return 0; };'},
 {partition:'early',name:'duplicate-strict-parameters',source:'"use strict"; function f(x,x){}'},
 {partition:'early',name:'getter-parameters',source:'const o = {get x(a){return a;}};'},
 {partition:'early',name:'invalid-assignment-target',source:'for(function(){} in {}){}'},
];
const rows=[];for(const fixture of own)for(const mode of modes){
 const sf=parse(fixture.source,mode);let verdict,error=null;try{verdict=sf.parseDiagnostics.length?'parse-failed':listing(sf).size?'listed':'not listed';}catch(e){verdict='crashed';error=e.message;}
 let babelErrors=[];try{babelParse(sf.text,{sourceType:mode.goal,plugins:[...(['TS','TSX'].includes(mode.language)?['typescript']:[]),...(['TSX','JSX'].includes(mode.language)?['jsx']:[])]});}catch(e){babelErrors.push(e.reasonCode);}
 const row={...fixture,...mode,verdict,error,typescriptParseDiagnostics:sf.parseDiagnostics.map(d=>({code:d.code,start:d.start})),babelErrors,functionLikeRecoveryNodes:occurrences(sf).filter(ts.isFunctionLike).length,listedDespiteParseErrors:sf.parseDiagnostics.length?listing(sf).size:0};
 assert(['pass','pass-explicit'].includes(fixture.partition)?!babelErrors.length:babelErrors.length>0);
 rows.push(row);
}
fs.writeFileSync(auditDir+'negative.json',JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({fixtures:rows.length,partitions:rows.reduce((a,x)=>(a[x.partition]=(a[x.partition]??0)+1,a),{}),typescriptParseFailed:rows.filter(x=>x.typescriptParseDiagnostics.length).length,babelRejected:rows.filter(x=>x.babelErrors.length).length,listedDespiteParseErrors:rows.reduce((n,r)=>n+r.listedDespiteParseErrors,0)}));
