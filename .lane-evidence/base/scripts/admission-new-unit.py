"""Repeat the three recorded existing-pair checks and require identical verdicts."""
import pathlib,json,subprocess
R=pathlib.Path('/Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load');D=R/'results-bench/new-unit-load';rows=[]
for old in json.loads((D/'admission-before.json').read_text()):
 pair,unit=old['pair'],old['unit'];out=D/f'after-{pair}.json'
 args=['node',str(R/'langs/ts/check.mjs'),'--parent',str(R/f'langs/ts/tests/pairs/{pair}/parent.ts'),'--candidate',str(R/f'langs/ts/tests/pairs/{pair}/candidate.ts'),'--unit',unit,'--n','30','--no-project','--out',str(out)]
 p=subprocess.run(args,capture_output=True,text=True);print(p.stdout+p.stderr,flush=True)
 verdict=json.loads(out.read_text())['verdict'];assert verdict==old['verdict'],(old,verdict)
 rows.append({**old,'after':verdict})
(D/'admission-after.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows))
