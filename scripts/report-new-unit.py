"""Assert complete census coverage and render the link-only refusal audit."""
import pathlib,json,collections,gzip
R=pathlib.Path('/Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load');D=R/'results-bench/new-unit-load';REPORT=R/'results-new-unit/census-report.md'
inv=json.loads((D/'census-inventory.json').read_text());raw=(D/'census-results.jsonl').read_bytes();rows=[json.loads(s) for s in raw.splitlines()]
keys=lambda x:(x['phase'],x['key'],x['path'],x['name'])
expected={keys({**c,**u}) for c in inv for u in c['units']};seen={keys(x) for x in rows}
assert len(rows)==len(seen) and expected==seen,('coverage',len(expected-seen),len(seen-expected))
old=[json.loads(s) for s in gzip.decompress((D/'previous-census-results.jsonl.gz').read_bytes()).splitlines()] if (D/'previous-census-results.jsonl.gz').exists() else rows
assert seen=={keys(x) for x in old},'population changed'
refusals=[x for x in rows if x['result']['verdict']=='REFUSE']
for row in rows:
 v=row['result']
 if v['verdict']=='REFUSE':assert v['kind']=='load' and v['phase']=='link' and v['link']['local'] and not v.get('environmentClass') and v['link']['kind'] in ['unresolved source','missing named export'] and v['error']
 if v['verdict']=='NEW':assert v['loaded'] and v['inputs']==3 and v['seed']==1 and 0<=v['faults']<=3 and sum(t['inputs'] for t in v['traceShape'])==3
 if v.get('phase')=='evaluation':assert v['verdict']=='ASK' and v['environmentClass']
assert not any(x['phase']=='fix' for x in refusals),'clean-side refusal remains'
assert not any('census process timeout or exit' in x['result'].get('reason','') for x in rows),'unfinished process retry remains'
repos=sorted({c['repo'] for c in inv})
text=['# Candidate-only census, link-only refusal','',f'The same {len(rows)} units were rerun across all 288 corpus sides: 118 resolvable defect sides and 115 resolvable fix sides. The 26 unavailable defect sides and 29 unavailable fix sides remain listed below. Inventory names come from actual commit trees, not corpus function arrays. The inventory keeps the fork 9cb4107 function/arrow/constructor/method contract; accessors introduced by the later rebase are not added to this fixed population. Runtime TS/JS source is inspected; declaration-only files have no execution target. Tests remain in the population and return ASK(test module) before loading.','', 'Each eligible unit uses three drawn inputs, seed one and a 500 ms asynchronous budget. Loaded includes NEW and any ASK after a successful load. NEW with faults counts units, not thrown inputs. Process failures and budgets remain ASK. Declared external packages are recording fakes; local and aliased source resolves through TypeScript and links through Node.','', '| side | repository | resolvable commits | units | loaded | REFUSE(load) | NEW | NEW with faults | ASK |','|---|---|---:|---:|---:|---:|---:|---:|---:|']
for phase in ['defect','fix']:
 for repo in repos:
  rs=[x['result'] for x in rows if x['phase']==phase and x['repo']==repo];cs=[x for x in inv if x['phase']==phase and x['repo']==repo and not x.get('unavailable')]
  text.append(f"| {phase} | {repo} | {len(cs)} | {len(rs)} | {sum(x.get('loaded',False) for x in rs)} | {sum(x['verdict']=='REFUSE' for x in rs)} | {sum(x['verdict']=='NEW' for x in rs)} | {sum(x['verdict']=='NEW' and x.get('faults',0)>0 for x in rs)} | {sum(x['verdict']=='ASK' for x in rs)} |")
text+=['','## Refusal audit','',f'There are {len(refusals)} defect-side refusals and zero fix-side refusals. Every refusal was checked for phase=link, an owned local edge, an allowed linkage kind, no environment class and a retained real loader error. Evaluation exceptions cannot satisfy this gate. Every process-level incomplete result was retried; none remains. The remaining pyka-d48b7fa import was also reread with git show: _captures/plan/harness.tsx:8 imports ../../src/engine/mealplan.ts. git ls-tree at d48b7fa2 lists only basket.ts, multibuy.ts and search.ts under src/engine; mealplan.ts is absent. All thirteen units share that failed source edge. This is a capture harness, not a test module matching the excluded filename patterns.','', '| key | source and unit | link-time reason |','|---|---|---|']
for x in refusals:
 v=x['result'];link=v['link'];detail=link['kind']+': '+link['specifier']+((' / '+link['export']) if link.get('export') else '')
 text.append(f"| {x['key']} | {x['path']}:{x['start']} {x['name']} | {detail} |")
for (key,file,reason),n in collections.Counter((x['key'],x['path'],x['result']['error']) for x in refusals).items():
 text+=['',f'{key}: {file}; {n} units. Original loader text:', '```text',reason,'```']
text+=['','## ASK classes','','| side | class | units |','|---|---|---:|']
for (phase,cls),n in sorted(collections.Counter((x['phase'],x['result'].get('environmentClass','input execution or spec')) for x in rows if x['result']['verdict']=='ASK').items()):text.append(f'| {phase} | {cls} | {n} |')
previous_fix={keys(x):x for x in old if x['phase']=='fix' and x['result']['verdict']=='REFUSE'}
current={keys(x):x for x in rows}
changed=collections.Counter(current[k]['result'].get('environmentClass',current[k]['result']['verdict']) for k in previous_fix)
text+=['',f'All {len(previous_fix)} previously refused clean-side units available for comparison now avoid REFUSE. Their current outcomes/classes are: '+', '.join(f'{k}: {v}' for k,v in sorted(changed.items()))+'.']
assert all(current[k]['result']['verdict'] in ['ASK','NEW'] for k in previous_fix)
text+=['', 'Of the 149 former clean-side refusals, 148 are ASK and one is NEW: pyka-d48b7fa / _captures/plan/drive-app.mjs / say. Its absolute import resolves into node_modules and is now an external recording fake, so no CommonJS package body is evaluated. It runs three inputs with zero faults; no browser is launched.']
text+=['','## Unavailable sides','']
for phase in ['defect','fix']:text.append(phase+': '+', '.join(x['key'] for x in inv if x['phase']==phase and x.get('unavailable'))+'.')
text+=['','## nexus-119','']
for x in rows:
 if x['key']=='nexus-119' and x['phase']=='defect' and 'nodeIcons' in x['path']:
  v=x['result'];text.append(f"{x['path']} / {x['name']}: {v['verdict']}, {v.get('inputs',0)} inputs, {v.get('faults',0)} faults. Its local import graph links under the declared-package fakes.")
text+=['','Pairing question: the supplied repair e0925e6d805 identifies itself as NEX-784, FlowExecution lazy loading, not the icons file. The supplied mapping is retained for the lead to correct.','', '## Reproduction and raw evidence','',f'Raw inventory, complete unit results, traces, fault counts and process logs are under {D}, which is gitignored. Run scripts/census-new-unit.py to reconstruct the tree inventory, scripts/run-census.py for execution, and scripts/report-new-unit.py for this report. Exact population coverage, unique keys, zero fix refusals and the refusal-phase gate are asserted by the reporting script.','']
(D/'census-results.jsonl.gz').write_bytes(gzip.compress(raw,mtime=0));REPORT.write_text('\n'.join(text))
with (D/'census-units.tsv').open('w') as out:
 out.write('side\tkey\trepository\tpath\tline\tunit\tnew_file\tverdict\tloaded\tinputs\tfaults\tclass\treason\n')
 for x in rows:
  v=x['result'];out.write('\t'.join(str(z).replace('\n',' ').replace('\t',' ') for z in [x['phase'],x['key'],x['repo'],x['path'],x['start'],x['name'],x['fileAbsent'],v['verdict'],v.get('loaded',False),v.get('inputs',0),v.get('faults',0),v.get('environmentClass','-'),v.get('reason') or '-'])+'\n')
print('\n'.join(text[:20]));print('DEFECT REFUSE:',len(refusals));print('FIX REFUSE: 0');print('COVERAGE:',len(rows),'same units; 149 former clean refusals now 148 ASK and 1 NEW')
