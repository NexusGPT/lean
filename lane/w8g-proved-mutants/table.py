# the result table: every PASS-proved row of the baseline, its class and reason, and the recheck's verdict at this head
import json, sys
exec(open('/root/lanes/w8g-proved-mutants/scratch/reasons.py').read())
d = json.load(open('/root/lanes/w8g-proved-mutants/tree/lane/w3b-mutant-study/baseline.json'))
pp = [r for r in d['rows'] if r['verdict'] == 'PASS-proved']
re = {}
for f in sys.argv[1:]:
    for r in json.load(open(f))['rows']:
        re[(r['source'], r['where'], r['unit'], r['index'])] = r['verdict']
# the fourteen w3b read (its result: alias_result counts x2, exceptions_scope helper x2 and caller, library_cells freshMap x3,
# gen_walk clampUnit, heap5_conditional count, lane_b_reach nullPrototype, adapters usePick, array_copies_identity x2)
READ = {('alias_result', 'counts'), ('exceptions_scope', 'helper'), ('exceptions_scope', 'caller'), ('library_cells', 'freshMap'), ('gen_walk', 'clampUnit'), ('heap5_conditional', 'count'), ('lane_b_reach', 'nullPrototype'), ('adapters', 'usePick'), ('array_copies_identity', 'copyPushedA'), ('array_copies_identity', 'copyPushedS')}
esc = lambda s: s.replace('|', '\\|')
print('| # | source | where | unit | site | kind | was | mutant | w3b read | class | reason | verdict at this head |')
print('| ---: | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- |')
for i, r in enumerate(pp):
    v = re.get((r['source'], r['where'], r['unit'], r['index']), 'not rechecked')
    print(f"| {i} | {r['source']} | {r['where']} | {r['unit']} | {r['index']} | {r['kind']} | `{esc(r['was'])}` | `{esc(r['text'])}` | {'yes' if (r['where'], r['unit']) in READ else ''} | equivalent | {esc(R[i])} | {v} |")
