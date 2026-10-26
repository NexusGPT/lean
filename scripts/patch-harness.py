from pathlib import Path
import shutil,difflib
r=Path('/Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load');w=Path('/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness')
d=r/'harness-copy';d.mkdir(exist_ok=True)
for p in w.glob('*.py'):shutil.copy2(p,d/p.name)
s=(w/'run_b.py').read_text();out=s
out=out.replace("    if not (os.path.exists(pf) and os.path.exists(bf)): rec.update(verdict='ASK', reason='file absent on a side'); return rec", "    if not os.path.exists(bf): rec.update(verdict='ASK', reason='candidate file absent'); return rec\n    parent_args = ['--parent', pf] if os.path.exists(pf) else []")
out=out.replace('["node", LEAN + "/langs/ts/exec/run.mjs", "--parent", pf, "--candidate", bf', '["node", "--experimental-vm-modules", LEAN + "/langs/ts/exec/run.mjs", *parent_args, "--candidate", bf')
out=out.replace('    return rec\n\ndef main():', '''    for field in ('kind', 'phase', 'environmentClass', 'link', 'loaded', 'inputs', 'seed', 'fakes', 'faults', 'traceShape', 'assumptions', 'bound', 'candidateOnly'):
        if field in res: rec[field] = res[field]
    return rec

def candidate_units(pf, bf, known):
    """actual unit names recover additions omitted by corpus metadata"""
    def read(file):
        if not os.path.exists(file): return []
        p = subprocess.run(['node', LEAN + '/langs/ts/units.mjs', file, '--no-project'], capture_output=True, text=True, timeout=120)
        if p.returncode: raise RuntimeError(p.stdout + p.stderr)
        return json.loads(p.stdout)
    old = {u['name'] for u in read(pf)}
    result = {u['name']: u for u in known}
    for u in read(bf):
        if u['name'] not in old:
            result[u['name']] = dict(u, cls='nested' if u['form'] == 'method' else 'effect')
    return list(result.values())

def main():''')
out=out.replace("jobs_n = int(os.environ.get('JOBS', '8'))", "jobs_n = min(3, int(os.environ.get('JOBS', '3')))")
out=out.replace("paths = [f['path'] for f in d['def_files'] if f['in_parent']]", "paths = [f['path'] for f in d['def_files']]")
out=out.replace("units = [(f['path'], fn) for f in d['def_files'] if f['in_parent'] for fn in f['functions']", "units = [(f['path'], fn) for f in d['def_files'] for fn in candidate_units(f\"{pt}/{f['path']}\", f\"{bt}/{f['path']}\", f['functions'])")
out=out.replace("('WITNESS', 'PASS-bounded', 'ASK')", "('WITNESS', 'PASS-bounded', 'ASK', 'REFUSE', 'NEW')")
out=out.removesuffix('main()\n')+"if __name__ == '__main__':\n    main()\n"
p=r/'harness-patches';p.mkdir(exist_ok=True)
(p/'run_b.diff').write_text(''.join(difflib.unified_diff(s.splitlines(True),out.splitlines(True),fromfile='a/run_b.py',tofile='b/run_b.py')))
