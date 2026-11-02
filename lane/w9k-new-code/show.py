import json, sys
for f in sys.argv[1:]:
    try: d = json.load(open(f))
    except Exception as e: print(f, 'ERR', e); continue
    c = d.get('certificate') or d
    B = d if d.get('candidateOnly') else (c.get('lanes') or {}).get('B') or {}
    nu = (c.get('newUnit') or {})
    decl = nu.get('declaration') or d.get('declaration') or {}
    print('==', f.split('/')[-1], d.get('verdict'), '| faults', B.get('faults'), 'of', B.get('inputs'), '| reason', str(B.get('reason') or d.get('reason'))[:150])
    print('   decl', json.dumps({k: decl.get(k) for k in ('returns', 'inputs')})[:300])
    for r in (nu.get('records') or d.get('records') or []): print('   rec', json.dumps(r)[:400])
    print('   shapes', json.dumps(B.get('traceShape') or d.get('traceShape'))[:300], 'ex', json.dumps(B.get('faultExamples') or d.get('faultExamples'))[:200])
