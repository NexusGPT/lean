// Counterexample search for the reviewed grammar exclusions. This cannot prove exclusions.
import fs from 'node:fs';import assert from 'node:assert/strict';import {parse as babelParse} from '@babel/parser';
import {ts} from '../common.mjs';import {auditDir} from './schema.mjs';import {sources} from './contexts.mjs';import {parse,occurrences,fieldOf} from './fixtures.mjs';
const cells=JSON.parse(fs.readFileSync(auditDir+'cells.json'));let attempted=0,witnessed=0;const contradictions=[];
for(const c of cells.filter(c=>!c.feasible))for(const source of sources(c)){
 attempted++;const sf=parse(source,c);if(sf.parseDiagnostics.length)continue;if(c.goal==='script'&&ts.isExternalModule(sf))continue;
 const hit=occurrences(sf).some(n=>n.kind===ts.SyntaxKind[c.kind]&&n.parent?.kind===ts.SyntaxKind[c.parent]&&fieldOf(n)===c.field);if(!hit)continue;witnessed++;
 const options={allowJs:true,noLib:true,noResolve:true,experimentalDecorators:true,jsx:ts.JsxEmit.Preserve};const host=ts.createCompilerHost(options);host.getSourceFile=file=>file===sf.fileName?sf:undefined;const p=ts.createProgram([sf.fileName],options,host);if(p.getSyntacticDiagnostics(sf).length)continue;
 try{babelParse(sf.text,{sourceType:c.goal,plugins:[...(['TS','TSX'].includes(c.language)?['typescript']:[]),...(['TSX','JSX'].includes(c.language)?['jsx']:[]),'decorators-legacy']});}catch{continue;}
 contradictions.push({cell:c.id,reason:c.reason,source:sf.text});
}
fs.writeFileSync(auditDir+'exclusion-challenges.json',JSON.stringify({attempted,witnessed,contradictions},null,2)+'\n');console.log(JSON.stringify({attempted,witnessed,contradictions}));assert.equal(contradictions.length,0,'an exclusion has a parser-accepted counterexample');
