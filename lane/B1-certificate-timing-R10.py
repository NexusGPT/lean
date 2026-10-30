# Replacement for def R10 in DA harness/regress.sh. It times the product, not a second pipeline: each fixed unit runs
# once through bin/lean check, and the certificate's own timing record gives lane B (exec/run.mjs inside check.mjs) and
# lane A (the sum of the lane A keys present: correspondence, doubles, translate, theorem, dafny). A lane that did not
# run is absent from the certificate, never zero; a unit with no lane A key fails, since the parser needs A positive.
# The TIMING line keeps its shape (suite_seconds, pairs, units, A, B) and adds `lanes`, each unit's timing record as
# the certificate holds it. The A and B numbers differ in meaning from the old row, so the baseline is re-cut.
LANE_A_KEYS = ('correspondence', 'doubles', 'translate', 'theorem', 'dafny')
def R10(log):
    source,seconds=suite()
    suite_ok,_=parse('R1',source.read_text(),a.smoke)
    if not suite_ok: raise ValueError('timing suite failed')
    units=json.loads((F/'timing-units.json').read_text())[:2 if a.smoke else 20]
    timing={'suite_seconds':seconds,'pairs':env.get('LEAN_PAIRS','all'),'units':[],'A':{},'B':{},'lanes':{}}
    for u in units:
        ident=u['pair']+'::'+u['unit']; timing['units'].append(ident)
        pair=L/'langs/ts/tests/pairs'/u['pair']; wd=OUT/'timing'/u['pair']/u['unit']; wd.mkdir(parents=True)
        out=wd/'verdict.json'
        command(['node',L/'bin/lean','check','--parent',pair/'parent.ts','--candidate',pair/'candidate.ts','--unit',u['unit'],'--n','30','--no-project','--out',out],L,log)
        v=json.loads(out.read_text())
        t=(v.get('certificate') or {}).get('timing')
        if not isinstance(t,dict) or 'B' not in t: raise ValueError('certificate of '+ident+' has no lane B timing: '+str(v.get('verdict')))
        present=[k for k in LANE_A_KEYS if k in t]
        if not present: raise ValueError('certificate of '+ident+' has no lane A timing: '+str(v.get('verdict')))
        timing['B'][ident]=t['B']; timing['A'][ident]=sum(t[k] for k in present); timing['lanes'][ident]=t
        with log.open('a') as f: f.write('VERDICT '+ident+' '+str(v.get('verdict'))+' '+json.dumps(t)+'\n')
    log.write_text((log.read_text() if log.exists() else '')+'TIMING '+json.dumps(timing)+'\nEXIT 0\n')
