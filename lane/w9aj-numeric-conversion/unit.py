"""unit.py: persistent checkouts of the 12 ids, and lean's check.mjs on one mutated unit with the full verdict kept.
  python3 -I unit.py checkout                      # every id's PR checked out under /root/da-bench/w9aj/src
  python3 -I unit.py run <lean> <outdir> [id...]  # check.mjs per id (hard_check's options), verdict.json + log kept
"""
import hashlib, json, os, subprocess, sys, time
BENCH = '/root/runs/merge-w9ag-da/research/open-code-review/d3/bench'
sys.path.insert(0, os.path.join(os.path.dirname(BENCH), 'harness')); sys.path.insert(0, BENCH)
import common
from hard_check import mutant_text
SRC = '/root/da-bench/w9aj/src'
IDS = [l.strip() for l in open('/root/da-bench/w9aj/ids12.txt') if l.strip()]
inst = lambda i: json.load(open(os.path.join(BENCH, 'hard', 'instances', common.safe_id(i) + '.json')))
root = lambda d: os.path.join(SRC, common.safe_id(d['parent_of']))
if sys.argv[1] == 'checkout':
    for i in IDS:
        d = inst(i); r = root(d)
        if os.path.exists(os.path.join(r, '.ok')): continue
        for k in range(3):
            if os.path.exists(r): common.remove(r)
            os.makedirs(r)
            g = lambda *a: subprocess.run(['git', '-C', r] + list(a), capture_output=True, text=True, timeout=1800)
            g('init', '-q'); g('remote', 'add', 'origin', 'https://github.com/%s.git' % d['repo'])
            f = g('fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', d['commit']); c = g('-c', 'advice.detachedHead=false', 'checkout', '-q', '--detach', d['commit'])
            if f.returncode == 0 and c.returncode == 0: open(os.path.join(r, '.ok'), 'w').write('ok'); print('ok', i, flush=True); break
            print('fail', i, (f.stderr + c.stderr)[-300:], flush=True); time.sleep(30)
else:
    lean, out = sys.argv[2], sys.argv[3]; ids = sys.argv[4:] or IDS
    os.makedirs(out, exist_ok=True)
    for i in ids:
        d = inst(i); e = d['edit']; path = os.path.join(root(d), e['path'])
        raw = open(path, 'rb').read(); assert hashlib.sha256(raw).hexdigest() == e['file_sha256'], i
        stem, ext = os.path.splitext(path); cand = '%s.lean-hard-%s%s' % (stem, hashlib.sha1(i.encode()).hexdigest()[:8], ext)
        open(cand, 'w', encoding='utf-8', newline='').write(mutant_text(raw.decode('utf-8'), e['start'], e['end'], e['text']))
        o = os.path.join(out, common.safe_id(i)); os.makedirs(o, exist_ok=True); t0 = time.time()
        try:
            r = subprocess.run(['nice', '-n', '15', 'node', os.path.join(lean, 'langs', 'ts', 'check.mjs'), '--parent', path, '--candidate', cand, '--unit', e['unit'], '--n', '30', '--dafny-seconds', '30', '--out', os.path.join(o, 'verdict.json')],
                               cwd=os.path.join(lean, 'langs', 'ts'), capture_output=True, text=True, timeout=900, env=dict(os.environ, TMPDIR=o))
            st = r.returncode; open(os.path.join(o, 'log'), 'w').write(r.stdout + '\n--stderr--\n' + r.stderr)
        except subprocess.TimeoutExpired: st = 'wall'
        finally: os.remove(cand)
        try: v = json.load(open(os.path.join(o, 'verdict.json'))); B = v.get('certificate', {}).get('lanes', {}).get('B', {})
        except Exception: v, B = {}, {}
        print(i, 'exit', st, '%.1fs' % (time.time() - t0), v.get('verdict'), B.get('verdict'), json.dumps((v.get('witness') or {}).get('args'))[:100], flush=True)
