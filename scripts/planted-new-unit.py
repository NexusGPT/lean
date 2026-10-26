"""Break and restore actual runtime imports in three real candidate-only units."""
import pathlib,json,subprocess,hashlib
R=pathlib.Path('/Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load');D=R/'results-bench/new-unit-load';W=pathlib.Path('/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3');rows=[]
def execute(file,unit,tag):
 out=D/f'planted-{tag}.json'
 p=subprocess.run(['node',str(R/'langs/ts/check.mjs'),'--candidate',str(file),'--unit',unit,'--n','3','--out',str(out)],capture_output=True,text=True,timeout=60)
 print(p.stdout+p.stderr,flush=True)
 return json.loads(out.read_text())
for sample in json.loads((D/'bench.json').read_text()):
 if sample['after']['result']['verdict']!='NEW':continue
 file=W/f"work/bench/new-unit-load-bench-{sample['key']}/tree"/sample['path'];original=file.read_bytes();sha=hashlib.sha256(original).hexdigest();index=len(rows)
 before=execute(file,sample['name'],f'{index}-before');assert before['verdict']=='NEW'
 missing=f'./lean-planted-absent-import-{index}'
 try:
  p=subprocess.run(['node',str(R/'scripts/plant-load-fault.mjs'),str(file),missing],capture_output=True,text=True)
  if p.stderr:print(p.stderr)
  if p.returncode==2:continue
  assert p.returncode==0,p.stdout+p.stderr
  mutation=json.loads(p.stdout);broken=execute(file,sample['name'],f'{index}-broken')
  assert broken['verdict']=='REFUSE' and broken['kind']=='load' and broken['phase']=='link' and broken['link']['local'] and missing in broken['reason'],broken
 finally:file.write_bytes(original)
 restored=execute(file,sample['name'],f'{index}-restored');restored_sha=hashlib.sha256(file.read_bytes()).hexdigest();assert sha==restored_sha
 assert all(before[k]==restored[k] for k in ['verdict','inputs','faults']),restored
 rows.append({'key':sample['key'],'path':sample['path'],'unit':sample['name'],'originalSha256':sha,'restoredSha256':restored_sha,'mutation':mutation,'before':before,'broken':broken,'restored':restored})
 (D/'planted-checks.json').write_text(json.dumps(rows,indent=1));print(sample['name'],'NEW -> REFUSE(load) -> NEW; source restored',flush=True)
 if len(rows)==3:break
assert len(rows)==3
print('PLANTED: 3/3 load refusals; 3/3 exact source restorations')
