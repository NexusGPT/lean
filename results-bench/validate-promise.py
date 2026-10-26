from pathlib import Path
import subprocess,json,re,sys
r=Path('/Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise');name=sys.argv[1] if len(sys.argv)>1 else 'promise_then';d=r/'results-bench'/('validation' if name=='promise_then' else 'validation-'+name);d.mkdir(exist_ok=True);pair=r/'langs/ts/tests/pairs'/name
e=json.loads((pair/'expect.json').read_text());out=[]
def run(args):
 p=subprocess.run(args,cwd=r,text=True,capture_output=True);t=p.stdout+p.stderr;out.append('$ '+' '.join(map(str,args))+'\n'+t);print(t,flush=True);return p.returncode,t
for side in ['parent','candidate']:
 assert run(['node','langs/ts/lint/lint.mjs',str(pair/(side+'.ts')),'--no-project'])[0]==0
 assert run(['node','langs/ts/translate/translate.mjs',str(pair/(side+'.ts')),'--core','--suffix',side,'--no-project','--out',str(d/(side+'.dfy')),'--prelude',str(d/(side+'.pre.dfy'))])[0]==0
(d/'scope.json').write_text(json.dumps({'functions':{k:{'in_scope':'false'} for k in e['scope']}}));(d/'edit.json').write_text('{}')
assert run(['python3','-I','spec/theorem.py','--parent',str(d/'parent.dfy'),'--candidate',str(d/'candidate.dfy'),'--scope',str(d/'scope.json'),'--edit',str(d/'edit.json'),'--out',str(d/'theorem.dfy')])[0]==0
rc,t=run(['dafny','verify','--verification-time-limit','30',str(d/'theorem.dfy')]);(d/'dafny.log').write_text(t)
lines=(d/'theorem.dfy').read_text().splitlines();spans={};name=None
for i,line in enumerate(lines,1):
 m=re.match(r'lemma Equal_(\w+)(?:<[^>]*>)?\(',line)
 if m:name=m[1];spans[name]=[i,0]
 if line.startswith('} // END Equal_'):spans[name][1]=i
errors=[int(x) for x in re.findall(r'theorem.dfy\((\d+),\d+\): Error',t)]
assert 'finished with' in t,t
for name,want in e['equal'].items():
 a,b=spans[name];got=not any(a<=x<=b for x in errors);assert got==want,(name,want,got)
 line=f'Equal_{name}: '+('proved' if got else 'not proved');print(line);out.append(line)
for name,want in e['b'].items():
 f=d/('b-'+name+'.json');rc,t=run(['node','langs/ts/exec/run.mjs','--parent',str(pair/'parent.ts'),'--candidate',str(pair/'candidate.ts'),'--unit',name,'--n','30','--no-project','--out',str(f)])
 assert json.loads(f.read_text())['verdict']==want,(name,want,t)
for f in sorted((r/'fixtures/escapes/ts').glob('promise_*.ts')):
 rule=f.read_text().splitlines()[0].split(': ')[1];rc,t=run(['node','langs/ts/lint/lint.mjs',str(f),'--no-project']);assert rc==1 and rule in t
(d/'validation.log').write_text('\n'.join(out));print('promise validation: ALL PASS')
