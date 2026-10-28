import fs from 'node:fs';
import {ts,topLevelFunctions} from '../langs/ts/common.mjs';
const root='/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3';
const rows=JSON.parse(fs.readFileSync(root+'/results/soundness-v7.json'));
const selected=[],missing=[],seen=new Set();
for(const r of rows){const key=JSON.stringify([r.key,r.path,r.name]); if(seen.has(key))continue; seen.add(key);
 const file=`${root}/work/${r.key}/parent/tree/${r.path}`;
 if(!fs.existsSync(file)){missing.push({key:r.key,path:r.path,name:r.name});continue;}
 const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const unit=topLevelFunctions(sf).get(r.name);
 if(!unit){missing.push({key:r.key,path:r.path,name:r.name,why:'unit absent'});continue;}
 if(unit.params.some(p=>p.dotDotDotToken)) selected.push({key:r.key,path:r.path,name:r.name,file,mutants:rows.filter(x=>x.key===r.key&&x.path===r.path&&x.name===r.name)});
}
const out={rows:rows.length,units:seen.size,selected,missing};
fs.writeFileSync(new URL('rest-mutants.json',import.meta.url),JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
