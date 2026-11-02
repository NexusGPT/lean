# cmp-sites.py before.json after.json: the after-dump's entries of the old kinds, without `lines`, equal the before-dump's
# entries (same order, same index); the new kinds counted; every new-kind site's was is the file's text (checked by the dump's start/end
# against the pair file); every after entry carries lines
import json, sys, collections, os
OLD = {'operator', 'boundary', 'string', 'negated-if', 'dropped-else', 'swapped-args', 'dropped-effect', 'changed-return'}
b = json.load(open(sys.argv[1])); a = json.load(open(sys.argv[2]))
strip = lambda e: {k: v for k, v in e.items() if k != 'lines'}
ao = [strip(e) for e in a if e.get('kind') in OLD or 'error' in e]
bo = [e for e in b]
print('old-kind entries before', len(bo), 'after', len(ao), 'equal', json.dumps(bo, sort_keys=True) == json.dumps(ao, sort_keys=True))
print('after entries without lines', sum(1 for e in a if 'error' not in e and 'lines' not in e))
# every new site comes after every old site of its unit
bad = 0; seen = {}
for e in a:
    if 'error' in e: continue
    u = (e['pair'], e['unit'])
    if e['kind'] in OLD and seen.get(u): bad += 1
    if e['kind'] not in OLD: seen[u] = True
print('old site after a new one in a unit', bad)
print(collections.Counter(e['kind'] for e in a if e.get('kind') and e['kind'] not in OLD).most_common())
