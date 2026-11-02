# prof.py <cpuprofile> [marker,...]: wall of the profile, self time by function (top 25), inclusive time of the named
# functions, and the time of the first sample under each marker function (seconds from the profile's start).
import json, sys, collections
d = json.load(open(sys.argv[1])); marks = sys.argv[2].split(',') if len(sys.argv) > 2 else []
nodes = {n['id']: n for n in d['nodes']}; parent = {}
for n in d['nodes']:
    for c in n.get('children', []): parent[c] = n['id']
def name(n): cf = n['callFrame']; return '%s %s:%d' % (cf['functionName'] or '(anon)', cf['url'].split('/')[-1], cf['lineNumber'] + 1)
selft = collections.Counter(); incl = collections.Counter(); first = {}
t = 0
for s, dt in zip(d['samples'], d['timeDeltas']):
    t += dt; selft[name(nodes[s])] += dt
    seen = set(); x = s
    while x is not None:
        fn = nodes[x]['callFrame']['functionName']
        if fn not in seen: seen.add(fn); incl[fn] += dt
        if fn in marks and fn not in first: first[fn] = t / 1e6
        x = parent.get(x)
print('wall %.1f s' % ((d['endTime'] - d['startTime']) / 1e6))
for k, v in selft.most_common(25): print('%8.1f s self  %s' % (v / 1e6, k))
for m in marks: print('%8.1f s incl  %s  first at %s' % (incl[m] / 1e6, m, first.get(m)))
