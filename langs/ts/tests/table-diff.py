#!/usr/bin/env python3
# Table diff of two lean suite logs (tests/run.mjs output): the rows of the final table (a row with its continuation lines, a detail that
# spans lines), the `time` rows, the STEP CACHE and the WALL lines left out. Usage: table-diff.py <reference> <new>
import sys, re, difflib

def rows(path):
    lines = open(path, encoding='utf8').read().split('\n')
    head = next(i for i, l in enumerate(lines) if re.match(r'^\| kind +\| name +\| check +\| res  \| lsc accepts \| detail$', l))
    m = re.match(r'^\| (kind +) \| (name +) \| (check +) \| ', lines[head])
    wk, wn, wc = (len(g) for g in m.groups())
    rowre = re.compile(r'^\| .{%d} \| .{%d} \| .{%d} \| (PASS|FAIL) \| .{11} \| ' % (wk, wn, wc))
    out, end = [], None
    for i in range(head + 1, len(lines)):
        l = lines[i]
        if l.startswith('| STEP CACHE |'): end = i; break
        if rowre.match(l): out.append([l])
        else: out[-1].append(l)
    tail = [l for l in lines[end:] if l.startswith('| TOTAL |')]
    recs = ['\n'.join(r) for r in out if not r[0].startswith('| time ')]
    return recs, tail, (wk, wn, wc)

# measurements a row's detail carries, different on any two runs (even two sequential runs of one commit): masked for
# the second comparison only, the exact one is reported first
MASKS = [
    (r'\((\d+(?:\.\d+)?) s\)', '(<s> s)'),                     # the doubles reading's solver seconds
    (r'duration_ms [\d.]+', 'duration_ms <ms>'),                  # node:test durations
    (r'"(seconds|heapUsed|heapTotal|rss|external|arrayBuffers)":[\d.e+-]+', r'"\1":<n>'),
    (r'^/dev/\S+.*$', '<df line>'),                               # disk free, as df prints it
    (r'\.(summary|checkpoint)-\w+', r'.\1-<tmp>'),                # temporary folder names
    (r'after \d+ s of wall time', 'after <s> s of wall time'),       # a bound's wall time when it was hit
    (r'/[^\s"\']*?/(?=langs/ts/)', '<checkout>/'),                  # the checkout the run ran in
]
def mask(r):
    for pat, rep in MASKS: r = re.sub(pat, rep, r, flags=re.M)
    return r

a, ta, wa = rows(sys.argv[1]); b, tb, wb = rows(sys.argv[2])
print(f'reference: {len(a)} rows (time rows left out), {ta}; widths {wa}')
print(f'new:       {len(b)} rows (time rows left out), {tb}; widths {wb}')
diff = list(difflib.unified_diff(a, b, 'reference', 'new', n=0, lineterm=''))
if not diff and ta == tb and wa == wb: print('IDENTICAL: every row the same, in the same order (time, STEP CACHE and WALL rows left out)')
else:
    print(f'DIFFERENT: {sum(1 for d in diff if d[:1] in "+-" and not d.startswith(("+++", "---")))} differing row(s)')
    for d in diff: print(d)
    md = list(difflib.unified_diff([mask(x) for x in a], [mask(x) for x in b], 'reference', 'new', n=0, lineterm=''))
    if not md and ta == tb and wa == wb: print('MEASUREMENTS ONLY: with the measured numbers above masked (solver seconds, durations, heap and disk sizes, temporary names), every row is the same, in the same order')
    else:
        print(f'AFTER MASKING, STILL DIFFERENT: {sum(1 for d in md if d[:1] in "+-" and not d.startswith(("+++", "---")))} differing row(s)' + ('' if ta == tb else f'; TOTAL {ta} vs {tb}'))
        for d in md: print(d)
sys.exit(0 if not diff and ta == tb else 1)
