# under.py <cpuprofile> <function>: inclusive seconds of every function called under <function> (top 30), and of
# <function> by the file argument it ran on is not visible here; by caller frame only.
import json, sys, collections
d = json.load(open(sys.argv[1])); root = sys.argv[2]
nodes = {n['id']: n for n in d['nodes']}; parent = {}
for n in d['nodes']:
    for c in n.get('children', []): parent[c] = n['id']
def name(n): cf = n['callFrame']; return '%s %s:%d' % (cf['functionName'] or '(anon)', cf['url'].split('/')[-1], cf['lineNumber'] + 1)
incl = collections.Counter()
for s, dt in zip(d['samples'], d['timeDeltas']):
    chain = []; x = s
    while x is not None: chain.append(x); x = parent.get(x)
    names = [name(nodes[c]) for c in chain]
    roots = [i for i, c in enumerate(chain) if nodes[c]['callFrame']['functionName'] == root]
    if not roots: continue
    seen = set()
    for nm in names[:roots[-1]]:
        if nm not in seen: seen.add(nm); incl[nm] += dt
for k, v in incl.most_common(30): print('%8.1f s  %s' % (v / 1e6, k))
