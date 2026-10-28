"""Enumerate actual candidate-only units over every defect and fix commit. No clone writes."""
import json, os, pathlib, subprocess, sys, re
R=pathlib.Path('/Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load')
W=pathlib.Path('/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3')
GIT={'NexusGPT/nexus':'/Users/assem/Documents/GitHub/nexus','pyka':'/Users/assem/promo-app','NexusGPT/driftbench':'/Users/assem/Documents/GitHub/driftbench','NexusGPT/nexus-landing':'/Users/assem/Documents/GitHub/nexus-landing','NexusGPT/nutshell':str(W/'census/repos/nutshell'),'NexusGPT/nexus-desktop':str(W/'census/repos/nexus-desktop')}
ENV=dict(os.environ,GIT_NO_LAZY_FETCH='1',GIT_OPTIONAL_LOCKS='0')
OUT=R/'results-bench/new-unit-load';OUT.mkdir(exist_ok=True)
INVENTORY=OUT/('census-inventory-full.json' if '--full' in sys.argv else 'census-inventory.json')
def git(repo,*args):
 p=subprocess.run(['git','-C',GIT[repo],*args],capture_output=True,env=ENV)
 if p.stderr: print(p.stderr.decode(errors='replace'),file=sys.stderr)
 if p.returncode: raise RuntimeError('git failed: '+repr(args))
 return p.stdout

def scan():
 corpus=json.loads((W/'corpus.json').read_text()); rows=json.loads(INVENTORY.read_text()) if INVENTORY.exists() else []
 done={(x['phase'],x['key']) for x in rows}
 for phase,a,b in [('defect','parent_commit','def_commit'),('fix','fix_parent','fix_commit')]:
  for d in corpus:
   if (phase,d['key']) in done:continue
   repo=d['repo'];parent=d[a];candidate=d[b]
   if not parent or not candidate:
    rows.append({'phase':phase,'key':d['key'],'repo':repo,'parent':parent,'candidate':candidate,'units':[],'unavailable':'null revision in corpus.json'})
    INVENTORY.write_text(json.dumps(rows,indent=1));continue
   changed=git(repo,'diff','--name-only','--diff-filter=ACMRT','--no-renames','-z',parent,candidate).decode().split('\0')[:-1]
   parent_files=set(git(repo,'ls-tree','-r','--name-only','-z',parent).decode().split('\0')[:-1])
   files=[]
   for f in changed:
    if not re.search(r'\.[cm]?[jt]sx?$',f) or re.search(r'\.d\.[cm]?ts$',f):continue
    files.append({'path':f,'parent':git(repo,'show',parent+':'+f).decode(errors='replace') if f in parent_files else None,'candidate':git(repo,'show',candidate+':'+f).decode(errors='replace')})
   p=subprocess.run(['node',str(R/'scripts/unit-diff.mjs')],input=json.dumps(files),capture_output=True,text=True)
   if p.stderr: print(p.stderr,file=sys.stderr)
   if p.returncode:raise RuntimeError(p.stderr)
   units=json.loads(p.stdout)
   rows.append({'phase':phase,'key':d['key'],'repo':repo,'parent':parent,'candidate':candidate,'changedSourceFiles':len(files),'candidateOnlyFiles':[f['path'] for f in files if f['parent'] is None],'units':units,'port':d.get('port')})
   print(phase,d['key'],len(units),flush=True)
   INVENTORY.write_text(json.dumps(rows,indent=1))
 print('INVENTORY',len(rows),'commit sides;',sum(len(x['units']) for x in rows),'candidate-only units',flush=True)
if __name__=='__main__':scan()
