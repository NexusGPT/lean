"""Drive only the patched harness copy on small files."""
import sys,json,pathlib,os
R=pathlib.Path('/Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load');os.environ['LEAN_DIR']=str(R);sys.path.insert(0,str(R/'harness-copy'));import run_b
P=R/'langs/ts/tests/pairs/new_unit';rows=[]
for parent in ['no-parent.ts','old.ts']:
 units=run_b.candidate_units(str(P/parent),str(P/'candidate.ts'),[])
 out=R/f'results-bench/new-unit-load/harness-{parent}.json'
 if out.exists():out.unlink()
 result=run_b.run_unit(('fixture','candidate.ts',next(x for x in units if x['name']=='runs'),str(P/parent),str(P/'candidate.ts'),str(out),'3'))
 assert result['verdict']=='NEW' and result['inputs']==3 and 'assumptions' in result,result
 rows.append(result)
missing=run_b.run_unit(('fixture','absent.ts',{'name':'runs','cls':'effect'},str(P/'old.ts'),str(P/'absent.ts'),str(R/'results-bench/new-unit-load/harness-absent.json'),'3'))
assert missing['verdict']=='ASK';rows.append(missing)
for file,want,cls in [('throws.ts','ASK','module evaluation'),('excluded.spec.ts','ASK','test module'),('named.ts','REFUSE',None)]:
 out=R/f'results-bench/new-unit-load/harness-{file}.json'
 if out.exists():out.unlink()
 result=run_b.run_unit(('fixture',file,{'name':'never' if file=='throws.ts' else 'f' if file=='excluded.spec.ts' else 'broken','cls':'effect'},str(P/'no-parent.ts'),str(P/file),str(out),'3'))
 assert result['verdict']==want and result.get('environmentClass')==cls,result
 if want=='REFUSE':assert result['phase']=='link' and result['link']['local']
 rows.append(result)
(R/'results-bench/new-unit-load/harness-test.json').write_text(json.dumps(rows,indent=1));print(json.dumps(rows,indent=1))
