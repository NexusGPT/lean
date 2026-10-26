"""Run the census using disposable archive exports; record every unit and loader error."""
import json,os,pathlib,subprocess,sys,tarfile,shutil,concurrent.futures,hashlib,gzip
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from importlib.machinery import SourceFileLoader
c=SourceFileLoader('census',str(pathlib.Path(__file__).with_name('census-new-unit.py'))).load_module()
R,W,OUT=c.R,c.W,c.OUT
TREE=W/'work/bench/new-unit-load/tree'
LOG=OUT/'census-results.jsonl'

def run_file(job):
 row,file,units=job;tag=hashlib.sha256((row['phase']+row['key']+file+','.join(u['name'] for u in units)).encode()).hexdigest()[:20]
 dest=OUT/'census-files';dest.mkdir(exist_ok=True);out=dest/(tag+'.jsonl');request=dest/(tag+'.request.json');log=dest/(tag+'.log')
 if out.exists():out.unlink()
 request.write_text(json.dumps({'file':str(TREE/file),'units':units,'out':str(out)}))
 try:
  p=subprocess.run(['node','--experimental-vm-modules','--expose-gc','--max-old-space-size=1024',str(R/'scripts/run-census-file.mjs'),str(request)],capture_output=True,text=True,timeout=max(45,len(units)*15))
  log.write_text(p.stdout+p.stderr)
 except subprocess.TimeoutExpired as e:log.write_text(str(e))
 done=[json.loads(x) for x in out.read_text().splitlines()] if out.exists() else []
 seen={x['name'] for x in done}
 for u in units:
  if u['name'] not in seen:done.append({**u,'result':{'verdict':'ASK','reason':'census process timeout or exit; see '+str(log),'loaded':False}})
 for x in done:x.update({k:row[k] for k in ['phase','key','repo','parent','candidate']})
 return done

def main():
 if not LOG.exists() and LOG.with_suffix('.jsonl.gz').exists():LOG.write_bytes(gzip.decompress(LOG.with_suffix('.jsonl.gz').read_bytes()))
 inventory=json.loads((OUT/'census-inventory.json').read_text()); prior=[json.loads(s) for s in LOG.read_text().splitlines()] if LOG.exists() else []
 retry=set()
 if '--retry-incomplete' in sys.argv or '--retry-refusals' in sys.argv:
  def needs_retry(x):
   v=x['result'];why=v.get('reason','')
   return ('--retry-incomplete' in sys.argv and v['verdict']=='ASK' and 'census process timeout or exit' in why) or ('--retry-refusals' in sys.argv and v['verdict']=='REFUSE')
  retry={(x['phase'],x['key'],x['path'],x['name']) for x in prior if needs_retry(x)}
  prior=[x for x in prior if not needs_retry(x)]
  LOG.write_text(''.join(json.dumps(x)+'\n' for x in prior))
 done={(x['phase'],x['key'],x['path'],x['name']) for x in prior}
 for row in inventory:
  units=[u for u in row['units'] if (row['phase'],row['key'],u['path'],u['name']) not in done]
  if not units:continue
  # only this lane's disposable export is removed
  if TREE.exists():shutil.rmtree(TREE)
  TREE.mkdir(parents=True)
  names=c.git(row['repo'],'ls-tree','-r','--name-only','-z',row['candidate']).decode().split('\0')[:-1]
  paths=[n for n in names if not any(x in n.split('/') for x in ['node_modules','.git'])]
  # archive in bounded argument batches; the source clone is never modified
  for start in range(0,len(paths),1500):
   ar=subprocess.Popen(['git','-C',c.GIT[row['repo']],'archive','--format=tar',row['candidate'],*paths[start:start+1500]],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=c.ENV)
   tar=subprocess.run(['tar','-x','-C',str(TREE)],stdin=ar.stdout,capture_output=True,text=True);ar.stdout.close();err=ar.communicate()[1]
   if err:print(err.decode(),file=sys.stderr)
   if tar.stderr:print(tar.stderr,file=sys.stderr)
   if ar.returncode or tar.returncode:raise RuntimeError('archive failed')
  groups={}
  for u in units:groups.setdefault((u['path'],u['name'] if '--isolated' in sys.argv or (row['phase'],row['key'],u['path'],u['name']) in retry else ''),[]).append(u)
  with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
   for result in pool.map(run_file,[(row,f[0],us) for f,us in groups.items()]):
    with LOG.open('a') as out:
     for x in result:out.write(json.dumps(x)+'\n')
    print(row['phase'],row['key'],result[0]['path'],len(result),{v:sum(x['result']['verdict']==v for x in result) for v in ['NEW','REFUSE','ASK']},flush=True)
 print('CENSUS COMPLETE',sum(1 for _ in LOG.open()),flush=True)
if __name__=='__main__':main()
