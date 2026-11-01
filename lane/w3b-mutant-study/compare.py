# compare a recheck study with the baseline rows it rechecked: verdict transitions and the check-time ratio
import json, sys, collections
base, after, btimes, atimes = sys.argv[1:5]
key = lambda r: (r['source'], r['where'], r['unit'], r['index'], r['kind'], r['was'])
B = {key(r): r for r in json.load(open(base))['rows']}
A = [r for r in json.load(open(after))['rows'] if r.get('kind')]
tr = collections.Counter((B[key(r)]['verdict'], r['verdict']) for r in A if key(r) in B)
print('transitions (before -> after):'); [print('  ', a, '->', b, n) for (a, b), n in sorted(tr.items(), key=lambda x: -x[1])]
same = sum(1 for r in A if key(r) in B and json.dumps(B[key(r)], sort_keys=True) == json.dumps(r, sort_keys=True))
print('rows byte-equal to the baseline row:', same, 'of', len(A))
tk = lambda x: (x['source'], x['where'], x['unit'], x['index'])
bt = {tk(x): x['seconds'] for f in btimes.split(',') for x in json.load(open(f))['all']}
at = {tk(x): x['seconds'] for x in json.load(open(atimes))['all']}
common = [k for k in at if k in bt]
sb, sa = sum(bt[k] for k in common), sum(at[k] for k in common)
print(f'check seconds on {len(common)} common sites: before {sb:.0f} (mean {sb/len(common):.1f}), after {sa:.0f} (mean {sa/len(common):.1f}), ratio {sa/sb:.2f}')
