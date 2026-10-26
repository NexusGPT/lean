"""Single-unit probes before the one final suite run."""
import pathlib,json,subprocess
R=pathlib.Path('/Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load');D=R/'langs/ts/tests/pairs/new_unit';OUT=R/'results-bench/new-unit-load'
rows=[]
for i,want in enumerate(json.loads((D/'expect.json').read_text())['candidateOnly']):
 out=OUT/f'probe-{i}.json'
 command=['node',str(R/'langs/ts/check.mjs'),'--candidate',str(D/want['file']),'--unit',want['unit'],'--n','30','--out',str(out)]
 if not want.get('project'):command+=['--no-project']
 if want.get('parent'):command+=['--parent',str(D/want['parent'])]
 p=subprocess.run(command,capture_output=True,text=True);result=json.loads(out.read_text())
 ok=result['verdict']==want['verdict'] and all(result.get(k)==want[k] for k in ['kind','inputs','faults','environmentClass','phase'] if k in want) and ('reason' not in want or want['reason'] in result.get('reason',''))
 if want.get('linkKind'):ok = ok and result.get('link',{}).get('kind')==want['linkKind']
 print(want['file'],want['unit'],ok,result['verdict'],result.get('faults'),flush=True)
 rows.append({'case':want,'ok':ok,'result':result,'stderr':p.stderr})
 assert ok,result
(OUT/'probes.json').write_text(json.dumps(rows,indent=1))
