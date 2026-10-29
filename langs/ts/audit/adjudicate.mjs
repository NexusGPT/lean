// Manual decisions after review-samples.mjs source-token inspection and sample identity review.
// IDs are frozen by the hash-sorted sample manifest; assertions reject changed evidence.
import fs from 'node:fs';import assert from 'node:assert/strict';import {auditDir} from './schema.mjs';
const samples=JSON.parse(fs.readFileSync(auditDir+'samples.json'));
const babelIdentity=new Set([4,7,10,25,27,29,32,38,42,44,47,50]);
const signatures=new Set([19,23]);
const rows=samples.map(s=>{const i=Number(s.sampleId.split(':')[1]);let category,reason,intentionalTypeOnly=false;
 if(s.stratum==='lean-only'||babelIdentity.has(i)){category='identity mismatch';reason='Same exported declaration, same exclusive end and function kind; TypeScript includes export, Babel function starts after export.';assert(s.tsMatch.listed&&s.nearbyOther.length===1);assert.equal(Math.abs(s.start-s.nearbyOther[0].start),7);assert.equal(s.end,s.nearbyOther[0].end);}
 else {category='real omission';assert(s.tsMatch&&!s.tsMatch.listed);assert.equal(s.start,s.tsMatch.start);assert.equal(s.end,s.tsMatch.end);
  if(signatures.has(i)){assert(!s.tsMatch.body);intentionalTypeOnly=true;reason=i===19?'Constructor overload signature is absent from the listing; deliberate bodiless-member exclusion, not missing executable behavior.':'Abstract method signature is absent from the listing; deliberate bodiless-member exclusion, not missing executable behavior.';}
  else {assert(s.tsMatch.body);reason='Executable function occurrence exists in both parser trees at the same span; lean does not list this '+s.tsMatch.parent+'.'+s.tsMatch.field+' occurrence.';}
 }
 return {...s,category,reason,intentionalTypeOnly};});
const counts={};for(const stratum of ['lean-only','babel-only']){const sample=rows.filter(r=>r.stratum===stratum);counts[stratum]={sample:sample.length,realOmission:sample.filter(r=>r.category==='real omission').length,parserDialectDifference:sample.filter(r=>r.category==='parser dialect difference').length,identityMismatch:sample.filter(r=>r.category==='identity mismatch').length,intentionalTypeOnly:sample.filter(r=>r.intentionalTypeOnly).length,executableOmission:sample.filter(r=>r.category==='real omission'&&!r.intentionalTypeOnly).length};}
fs.writeFileSync(auditDir+'adjudication.json',JSON.stringify({method:'Manual source-token and parent-field review; frozen sample IDs, decisions verified against occurrence evidence. No population estimate.',counts,rows},null,2)+'\n');console.log(JSON.stringify(counts));
