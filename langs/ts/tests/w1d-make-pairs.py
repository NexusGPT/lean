#!/usr/bin/env python3
# Writes the w1d pairs langs/ts/tests/pairs/opaque_<rule>/ from one spec per rule (design/w1d-opaque-async.md).
# Every pair holds the same units around its rule's construct C (the expression the finding names, with the literal 3
# inside it and nowhere else in the unit):
#   outside  C unchanged, a refactor outside it (a new local)       -> PASS-proved, one opaque step
#   inside   C's text changed (3 -> 5)                             -> not proved; lane B WITNESS
#   upstream C unchanged, a local it reads changed before it (only C reads that local: everything outside C reads n)
#                                                                 -> not proved; lane B WITNESS; under LEAN_BREAK=async-drop-reads
#            (tests/break.mjs) it proves, a false PASS-proved the runner's break row expects (a change outside the construct, A1)
#   planted  exec/mutate.mjs applied at the boundary site 3 -> 4   -> not proved; lane B WITNESS
# plus the units a spec adds (capture: pending work reads a local written after the step; reorder: two steps swapped).
# Usage: python3 -I langs/ts/tests/w1d-make-pairs.py <tree> [rule ...]
import json, os, subprocess, sys
tree = sys.argv[1]; ts = os.path.join(tree, 'langs/ts'); pairs = os.path.join(ts, 'tests/pairs')
SVC = 'export interface Svc { put(n: number): Promise<void>; get(n: number): Promise<number>; ok(n: number): Promise<boolean>; raw(n: number): any; }\n'
def unit(name, sig, pre, construct, post, ret):
    return f'export {sig.replace("NAME", name)} {{\n  const k = {pre};\n  {construct}\n{post}  return {ret};\n}}\n'
SPECS = {
  'async': dict(helpers='async function load(svc: Svc, n: number): Promise<number> { const v = await svc.get(n); await svc.put(v + 1); return v; }\n', sig='async function NAME(svc: Svc, n: number): Promise<number>', construct='load(svc, k * 3);', ret='n * 2', post='', why='an async unit called without await',
      extra={'reorder': ('async function reorder(svc: Svc, a: number, b: number): Promise<number> {\n  const x = await load(svc, a);\n  load(svc, x);\n  load(svc, b);\n  return x;\n}\n', None, None)}),
  'promise': dict(helpers='async function load(svc: Svc, n: number): Promise<number> { const v = await svc.get(n); await svc.put(v + 1); return v; }\n', sig='function NAME(svc: Svc, n: number): Promise<number>', construct='return load(svc, k * 3);', ret=None, post='', why='a non-async unit returns a same-file async call (no handle)'),
  'promise-pending': dict(sig='async function NAME(svc: Svc, n: number): Promise<number>', construct='new Promise<void>((resolve) => { svc.put(k * 3); resolve(); });', ret='n * 2', post='', why='an unconsumed new Promise'),
  'promise-unsettled': dict(sig='async function NAME(svc: Svc, n: number): Promise<number>', construct='await new Promise<void>((resolve) => { resolve(); svc.put(k * 3); });', ret='n * 2', post='', why='statements after settlement'),
  'promise-executor': dict(sig='async function NAME(svc: Svc, n: number): Promise<number>', construct='const v = await new Promise<number>(async (resolve) => { const r = await svc.get(k * 3); resolve(r); });', ret='v + n * 2', post='', why='an async executor'),
  'promise-executor-escape': dict(sig='async function NAME(svc: Svc, n: number): Promise<number>', construct='await new Promise<void>((resolve) => { const done = resolve; svc.put(k * 3); done(); });', ret='n * 2', post='', why='a stored resolver'),
  'async-callback': dict(sig='async function NAME(svc: Svc, xs: number[], n: number): Promise<number>', construct='xs.map(async (x) => { await svc.put(x + k * 3); });', ret='n * 2', post='', why='map with an async callback, not awaited',
),
  'async-predicate': dict(sig='async function NAME(svc: Svc, xs: number[], n: number): Promise<number>', construct='const ys = xs.filter(async (x) => await svc.ok(x + k * 3));', ret='ys.length + n * 2', post='', why='filter with an async predicate'),
  'async-reduce': dict(sig='async function NAME(svc: Svc, xs: number[], n: number): Promise<number>', construct='const t = await xs.reduce(async (acc, x) => (await acc) + (await svc.get(x + k * 3)), Promise.resolve(0));', ret='t + n * 2', post='', why='reduce with an async accumulator'),
  'generator-use': dict(helpers='function* gen(n: number) { yield n; yield n + 1; }\nfunction sum(xs: Iterable<number>): number { let s = 0; for (const x of xs) s += x; return s; }\n', sig='function NAME(n: number): number', construct='const s = sum(gen(k * 3));', ret='s + n * 2', post='', why='a pure generator handed to a function'),
}
EQUIV = {'n * 2': 'n + n', 'v + n * 2': 'v + (n + n)', 'ys.length + n * 2': 'ys.length + (n + n)', 't + n * 2': 't + (n + n)', 'r.length + n * 2': 'r.length + (n + n)', 's + n * 2': 's + (n + n)'}
def build(rule, sp):
    d = os.path.join(pairs, 'opaque_' + rule.replace('-', '_')); os.makedirs(d, exist_ok=True)
    head = f'// opaque_{rule.replace("-", "_")}: rule `{rule}` ({sp["why"]}): the construct is one opaque step (design/w1d-opaque-async.md)\n' + SVC + sp.get('helpers', '')
    P, C = [head], [head]
    for name in ['outside', 'inside', 'upstream', 'planted']:
        ret = sp['ret']; pre = 'n + 1'
        p = unit(name, sp['sig'], pre, sp['construct'], sp['post'], ret) if ret else unit(name, sp['sig'], pre, sp['construct'], sp['post'], '').replace('  return ;\n', '')
        c = p
        if name == 'outside': c = p.replace(f'return {ret};', f'const out = {ret};\n  return out;') if ret else p.replace('const k = n + 1;', 'const j = n;\n  const k = j + 1;')
        if name == 'inside': c = p.replace('* 3', '* 5')
        if name == 'upstream': c = p.replace('const k = n + 1;', 'const k = n + 2;')
        assert name in ('planted',) or c != p, (rule, name)
        P.append(p); C.append(c)
    extra = sp.get('extra', {})
    for name, (text, old, new) in extra.items():
        P.append('export ' + text)
        C.append('export ' + (text.replace(old, new) if old else swap(text)))
    open(os.path.join(d, 'parent.ts'), 'w').write(''.join(P))
    cand = os.path.join(d, 'candidate.ts'); open(cand, 'w').write(''.join(C))
    sites = json.loads(subprocess.run(['node', 'exec/mutate.mjs', cand, '--unit', 'planted', '--list', '--no-project'], cwd=ts, capture_output=True, text=True, check=True).stdout)
    pick = [s for s in sites if s['kind'] == 'boundary' and s['was'] == '3']; assert len(pick) == 1, (rule, sites)
    out = subprocess.run(['node', 'exec/mutate.mjs', cand, '--unit', 'planted', '--index', str(pick[0]['i']), '--no-project', '--out', cand], cwd=ts, capture_output=True, text=True, check=True)
    names = ['outside', 'inside', 'upstream', 'planted'] + list(extra)
    helpers = [h.split('(')[0].split()[-1].lstrip('*') for h in sp.get('helpers', '').splitlines() if h.strip()]
    equal = {**{h: True for h in helpers}, 'outside': True, 'inside': False, 'upstream': False, 'planted': False, **{x: False for x in extra}}
    b = {'outside': 'PASS-bounded', 'inside': 'WITNESS', 'upstream': 'WITNESS', 'planted': 'WITNESS', **{x: 'WITNESS' for x in extra}}
    exp = {'scope': helpers + names, 'equal': equal, 'why': f'rule {rule} ({sp["why"]}): the construct the finding names is one opaque step keyed by its tokens, the texts of the same-file functions it reaches and its module cells; a change outside it proves, a change inside it or in a value it reads does not, and lane B runs the real code (design/w1d-opaque-async.md)', 'opaque': {x: [rule] for x in ['outside', 'inside', 'upstream', 'planted'] + list(extra)}, 'b': b,
           'break': [{'mechanism': 'async-drop-reads', 'equal': {'upstream': True}}]}
    json.dump(exp, open(os.path.join(d, 'expect.json'), 'w'), indent=1); open(os.path.join(d, 'expect.json'), 'a').write('\n')
    print(rule, d, out.stdout.strip()[:80])
def swap(text):
    lines = text.split('\n'); i = [j for j, l in enumerate(lines) if l.strip().startswith('load(svc, x)')][0]
    lines[i], lines[i + 1] = lines[i + 1], lines[i]; return '\n'.join(lines)
for rule in (sys.argv[2:] or SPECS):
    build(rule, SPECS[rule])
