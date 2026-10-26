"""Ten real candidate-only units before and after, with ordinary proof admission reported separately."""
import json,pathlib,subprocess,sys,os,collections
from importlib.machinery import SourceFileLoader
c=SourceFileLoader('census',str(pathlib.Path(__file__).with_name('census-new-unit.py'))).load_module();R,W,OUT=c.R,c.W,c.OUT
BASE=OUT/'baseline';BASE.mkdir(exist_ok=True)
def run(args,timeout=120):
 try:
  p=subprocess.run(args,capture_output=True,text=True,timeout=timeout);return {'status':p.returncode,'stdout':p.stdout,'stderr':p.stderr}
 except subprocess.TimeoutExpired as e:return {'status':124,'stdout':str(e.stdout),'stderr':str(e.stderr)}
if not (BASE/'langs/ts/exec/run.mjs').exists():
 ar=subprocess.Popen(['git','-C',str(R),'archive','9cb4107'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 p=subprocess.run(['tar','-x','-C',str(BASE)],stdin=ar.stdout,capture_output=True,text=True);ar.stdout.close();err=ar.communicate()[1]
 if err:print(err.decode(),file=sys.stderr)
 assert ar.returncode==p.returncode==0,p.stderr
inv=json.loads((OUT/'census-inventory.json').read_text());chosen=[];per=collections.Counter();files_chosen=set()
for row in inv:
 if row['phase']!='defect':continue
 for u in row['units']:
  if (row['repo'],u['path']) in files_chosen:continue
  if per[row['repo']]>=3 or u['end']-u['start']+1>120 or any(k in u['path'] for k in ['.spec.','.test.','__tests__','stories']):continue
  chosen.append((row,u));per[row['repo']]+=1;files_chosen.add((row['repo'],u['path']))
  if len(chosen)==10:break
 if len(chosen)==10:break
assert len(chosen)==10
results=[];empty=OUT/'empty-parent.ts';empty.write_text('export {};\n')
for i,(row,u) in enumerate(chosen):
 tree=W/f"work/bench/new-unit-load-bench-{row['key']}/tree";tree.mkdir(parents=True,exist_ok=True)
 names=c.git(row['repo'],'ls-tree','-r','--name-only','-z',row['candidate']).decode().split('\0')[:-1]
 paths=[] if (tree/'.exported').exists() else [n for n in names if not any(x in n.split('/') for x in ['node_modules','.git'])]
 for start in range(0,len(paths),1500):
  ar=subprocess.Popen(['git','-C',c.GIT[row['repo']],'archive',row['candidate'],*paths[start:start+1500]],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=c.ENV)
  p=subprocess.run(['tar','-x','-C',str(tree)],stdin=ar.stdout,capture_output=True,text=True);ar.stdout.close();err=ar.communicate()[1]
  if err:print(err.decode(),file=sys.stderr)
  assert ar.returncode==p.returncode==0,p.stderr
 (tree/'.exported').write_text(row['candidate'])
 file=tree/u['path'];rec={'repo':row['repo'],'key':row['key'],'candidate':row['candidate'],**u}
 for version,lean in [('before',BASE),('after',R)]:
  out=OUT/f'bench-{i}-{version}.json';ranges=OUT/'bench-ranges.json';ranges.write_text(json.dumps([[u['start'],u['end']]]))
  lint=run(['node',str(lean/'langs/ts/lint/lint.mjs'),str(file),'--changed',str(ranges),'--no-project'])
  tr=run(['node',str(lean/'langs/ts/translate/translate.mjs'),str(file),'--core','--only',u['name'],'--no-project','--out',str(OUT/'bench.dfy')])
  args=['node',str(lean/'langs/ts/exec/run.mjs'),'--candidate',str(file),'--unit',u['name'],'--n','3','--out',str(out)]
  if version=='before':args+=['--parent',str(empty)]
  execution=run(args,45)
  verdict=json.loads(out.read_text()) if out.exists() else {'verdict':'ASK','reason':execution['stderr'][-400:]}
  rec[version]={'lint':lint,'translate':tr,'execution':execution,'result':verdict}
 results.append(rec);(OUT/'bench.json').write_text(json.dumps(results,indent=1));print(i,row['repo'],u['name'],rec['before']['result']['verdict'],rec['after']['result']['verdict'],flush=True)
for version in ['before','after']:
 print(version,'lint',sum(x[version]['lint']['status']==0 for x in results),'translate',sum(x[version]['translate']['status']==0 for x in results),'verdicts',dict(collections.Counter(x[version]['result']['verdict'] for x in results)),flush=True)
print('Witness is not an applicable outcome for candidate-only execution; no equality mutant score is claimed.')
