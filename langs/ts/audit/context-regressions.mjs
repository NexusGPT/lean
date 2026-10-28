import fs from 'node:fs';import assert from 'node:assert/strict';
import {ts,topLevelFunctions} from '../common.mjs';import {auditDir} from './schema.mjs';import {occurrences} from './fixtures.mjs';
const cases=[
 ['object-method','const o={f(){return 0;}};',1,0],
 ['object-accessors','const o={get x(){return 0;},set x(v){}};',2,0],
 ['object-properties','const o={f:()=>0,g:function(){}};',2,0],
 ['class-expression','const C=class {f(){}};',1,0],
 ['class-field','class C { f=()=>0; }',1,0],
 ['computed-class-method','class C {["f"](){}}',1,0],
 ['string-class-method','class C {"f"(){}}',1,0],
 ['nested-function','function f(){function g(){}}',2,1],
 ['namespace-function','namespace N {export function f(){}}',1,0],
 ['multiple-declarators','const f=()=>0,g=()=>1;',2,0],
 ['mutable-binding','let f=()=>0;',1,0],
 ['parenthesized-binding','const f=(()=>0);',1,0],
 ['anonymous-default','export default function(){}',1,0],
 ['duplicate-method','class C {f(){} f(){}}',2,1],
 ['getter-name-collision','class C {get x(){return 0;} get_x(){}}',2,1],
 ['overload','function f(x:number):number; function f(x:number){return x;}',2,1],
 ['bodyless-function','declare function f():void;',1,1],
];
const rows=cases.map(([name,source,expectedOccurrences,expectedListed])=>{const sf=ts.createSourceFile('case.ts',source,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);const functions=occurrences(sf).filter(ts.isFunctionLike),listed=[...topLevelFunctions(sf).values()];assert.equal(functions.length,expectedOccurrences);assert.equal(listed.length,expectedListed);return {name,source,occurrences:functions.length,listed:listed.length,unlisted:functions.length-listed.length};});
fs.writeFileSync(auditDir+'context-regressions.json',JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({cases:rows.length,occurrences:rows.reduce((n,r)=>n+r.occurrences,0),listed:rows.reduce((n,r)=>n+r.listed,0),unlisted:rows.reduce((n,r)=>n+r.unlisted,0)}));
