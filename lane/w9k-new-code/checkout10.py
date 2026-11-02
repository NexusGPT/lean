"""Checkout the 4 parent PRs of the 10 new-code mutants; write, next to each mutated file, the mutant's version as
<stem>.w9k-<m>.<ext> (the PR head's file with mutant.patch applied) so check.mjs runs it in the project's context."""
import json, os, subprocess, sys
D3 = '/root/da-lanes/w9k-new-code/tree/research/open-code-review/d3'
sys.path[:0] = [D3 + '/harness', D3 + '/harness/calib']
import common
IDS = ['cline__cline#13827~m3', 'cline__cline#13857~m1', 'cline__cline#13857~m2', 'cline__cline#13857~m3',
       'mrdoob__three.js#35267~m1', 'mrdoob__three.js#35267~m2', 'mrdoob__three.js#35267~m3',
       'n8n-io__n8n#42038~m1', 'n8n-io__n8n#42038~m2', 'n8n-io__n8n#42038~m3']
CK = '/root/da-bench/w9k-new-code/ck'
out = {}
for mid in IDS:
    inst = json.load(open(f'{D3}/bench/instances/{mid}.json'))
    pid = inst['parent_of']; dest = os.path.join(CK, common.safe_id(pid))
    if not os.path.isdir(os.path.join(dest, '.git')):
        print('checkout', pid, flush=True)
        common.checkout(dest, inst['repo'], inst['base'], inst['commit'])
    truth = [t for t in inst['truth'] if t.get('kind') == 'mutant'][0]
    rel = truth['path']; stem, ext = os.path.splitext(rel); m = mid.split('~')[1]
    patch = open(f'/root/da-bench/instances-v4/{common.safe_id(mid)}/mutant.patch').read()
    mutated = f'{stem}.w9k-{m}{ext}'
    p = subprocess.run(['git', '-C', dest, 'apply', '--check', '-'], input=patch, text=True, capture_output=True)
    if p.returncode: raise SystemExit(f'{mid}: patch does not apply: {p.stderr}')
    orig = open(os.path.join(dest, rel)).read()
    subprocess.run(['git', '-C', dest, 'apply', '-'], input=patch, text=True, check=True)
    open(os.path.join(dest, mutated), 'w').write(open(os.path.join(dest, rel)).read())
    open(os.path.join(dest, rel), 'w').write(orig)
    out[mid] = {'checkout': dest, 'file': rel, 'mutated': mutated, 'unit': truth['unit'], 'lines': [truth['line_from'], truth['line_to']]}
json.dump(out, open('/root/da-bench/w9k-new-code/ten.json', 'w'), indent=1)
print(json.dumps(out, indent=1))
