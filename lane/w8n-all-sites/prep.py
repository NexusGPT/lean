# One checkout per PR of the witnessed slice mutants (materialise.py --restore), a worktree at the merge base beside
# it, and per mutant its candidate file (the materialiser's own edited()) written under /root/da-bench/w8n-all-sites.
import json, os, subprocess, sys
D3 = '/root/da-lead/research/open-code-review/d3'
sys.path.insert(0, os.path.join(D3, 'bench')); sys.path.insert(0, os.path.join(D3, 'harness'))
import materialise as M
OUT = '/root/da-bench/w8n-all-sites'
W = json.load(open('/root/lanes/w8n-all-sites/work/witnessed.json'))
def one(iid):  # only the listed instance files are read (M.load reads the whole folder, the AACR instances with it)
    i = json.load(open(os.path.join(M.INSTANCES, iid + '.json'), encoding='utf-8'))
    pp = (i.get('edit') or {}).get('patch')
    if pp:
        pp = os.path.join(os.path.dirname(os.path.abspath(M.INSTANCES)), pp)
        i['_patch'] = open(pp, encoding='utf-8', newline='').read() if os.path.isfile(pp) else None
    return i
insts = {w['id']: one(w['id']) for w in W}
def git(d, *a):
    r = subprocess.run(['git', '-C', d] + list(a), capture_output=True)
    if r.returncode: raise RuntimeError('git %s: %s' % (a, r.stderr.decode()[-300:]))
    return r.stdout
for w in W:
    pr = w['id'].split('~')[0]; ck = os.path.join(OUT, pr, 'head'); base = os.path.join(OUT, pr, 'base')
    inst = insts[w['id']]
    if not os.path.isdir(os.path.join(ck, '.git')):
        print('restore', w['id'], M.restore(inst, ck), flush=True)
    if not os.path.isdir(base):
        git(ck, 'worktree', 'add', '--detach', base, w['base'])
    head = git(ck, 'rev-parse', M.commit_of(inst) + '^{commit}').decode().strip()
    data = M.edited(git(ck, 'cat-file', 'blob', '%s:%s' % (head, inst['edit']['path'])), inst['edit'])
    d = os.path.join(OUT, 'mutants', w['id']); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'candidate' + os.path.splitext(w['path'])[1]), 'wb').write(data)
    print('ok', w['id'], inst['edit']['path'] == w['path'], flush=True)
