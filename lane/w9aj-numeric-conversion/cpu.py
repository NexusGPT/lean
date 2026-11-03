"""cpu.py <base> <tree> <pair>...: each pair on both trees in turn (base then tree), tests/run.mjs --pair, JOBS=1,
LEAN_STEP_CACHE=0, nice 15; the CPU time (user + sys) of the run and its children, the wall, the lane B rows."""
import json, os, resource, subprocess, sys, tempfile, time
base, tree, pairs = sys.argv[1], sys.argv[2], sys.argv[3:]
env = dict(os.environ, JOBS='1', LEAN_STEP_CACHE='0', LEAN_Z3='/opt/dafny/z3/bin/z3-4.12.1', LC_ALL='en_US.UTF-8', LEAN_WORKER_HEAP_MB='6144')
tot = {'base': [0, 0, 0], 'tree': [0, 0, 0]}
for p in pairs:
    for name, root in (('base', base), ('tree', tree)):
        fd, res = tempfile.mkstemp(suffix='.json'); os.close(fd)
        r0 = resource.getrusage(resource.RUSAGE_CHILDREN); t0 = time.time()
        rc = subprocess.run(['nice', '-n', '15', 'node', 'tests/run.mjs', '--pair', p, '--result', res], cwd=os.path.join(root, 'langs/ts'), env=env, capture_output=True).returncode
        r1 = resource.getrusage(resource.RUSAGE_CHILDREN); wall = time.time() - t0
        u, s = r1.ru_utime - r0.ru_utime, r1.ru_stime - r0.ru_stime
        try: rows = json.load(open(res))['rows']
        except Exception: rows = []
        os.remove(res)
        nb = sum(1 for x in rows if x['check'].startswith('lane B'))
        bad = sum(1 for x in rows if not x['ok'])
        tot[name][0] += u + s; tot[name][1] += wall; tot[name][2] += nb
        print('%s %s exit %s user %.2f sys %.2f wall %.2f laneB %d | TOTAL | %d checks | %s |' % (p, name, rc, u, s, wall, nb, len(rows), 'ALL PASS' if rows and not bad else '%d FAILED' % (bad or 1)), flush=True)
for k, (c, w, n) in tot.items():
    print('%s: cpu %.2f s, wall %.2f s, lane B units %d, cpu per unit %.3f s' % (k, c, w, n, c / max(n, 1)))
print('ratio cpu per unit tree/base %.3f' % ((tot['tree'][0] / max(tot['tree'][2], 1)) / (tot['base'][0] / max(tot['base'][2], 1))))
