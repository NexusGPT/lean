"""The 10 new-code mutants of one hour-bench run, by name: lean's row of the mutated unit (verdict, coverage, the kinds
of its records), the FACT records DA made on it (record level: a fact on the mutated unit), the comments of class
lean:new-unit-fact on it, and the scorer's M match (rendered level).

  python3 -I measure10.py <hour run dir> [<hour run dir> ...]
"""
import json, os, sys

TEN = ['cline__cline#13827~m3', 'cline__cline#13857~m1', 'cline__cline#13857~m2', 'cline__cline#13857~m3',
       'mrdoob__three.js#35267~m1', 'mrdoob__three.js#35267~m2', 'mrdoob__three.js#35267~m3',
       'n8n-io__n8n#42038~m1', 'n8n-io__n8n#42038~m2', 'n8n-io__n8n#42038~m3']
D3 = '/root/da-lanes/w9k-new-code/tree/research/open-code-review/d3'


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def one(run):
    score = load(os.path.join(run, 'score.json'))
    per = {r['id']: r for r in score['no_judge']['per_instance']}
    out = []
    for mid in TEN:
        inst = load(os.path.join(D3, 'bench', 'instances', mid + '.json'))
        t = [x for x in inst['truth'] if x['kind'] == 'mutant'][0]
        lp = os.path.join(run, 'records', 'mutants', mid, 'lean', mid + '.json')
        lean = load(lp) if os.path.exists(lp) else {}
        rows = [r for r in lean.get('lean_rows') or [] if r.get('file') == t['path'] and r.get('unit') == t['unit']]
        row = rows[0] if rows else {}
        kinds = sorted({x.get('kind') for x in row.get('records') or [] if not x.get('more')})
        ap = os.path.join(run, 'run', 'a', 'da-attest', mid + '.json')
        da = load(ap) if os.path.exists(ap) else {}
        facts = [r for r in (da.get('da') or {}).get('records') or [] if r.get('point') == 'FACT' and r.get('path') == t['path'] and r.get('unit') == t['unit']]
        comments = [c for c in (da.get('review') or {}).get('comments') or [] if str(c.get('class', '')).startswith('lean:new-unit-fact') and c.get('path') == t['path']]
        p = per.get(mid) or {}
        out.append({'id': mid, 'unit': t['unit'], 'lines': [t['line_from'], t['line_to']], 'lean': lean.get('status'),
                    'verdict': row.get('verdict'), 'coverage': row.get('coverage'), 'records': kinds,
                    'fact_records': sorted({r['class'].split(':')[-1] for r in facts}),
                    'fact_comments': [(c.get('start_line'), c.get('content', '')[:160]) for c in comments],
                    'matched': p.get('matched'), 'new_comments': p.get('new_comments')})
    return out


if __name__ == '__main__':
    for run in sys.argv[1:]:
        res = one(run)
        print('== %s: fact on the mutated unit %d of 10; M matched %d of 10' % (
            os.path.basename(run.rstrip('/')), sum(bool(r['fact_records']) for r in res), sum(bool(r['matched']) for r in res)))
        for r in res:
            print('  %-28s %-26s lean %-6s %-6s %-26s records %-40s facts %-18s matched %s' % (
                r['id'], r['unit'][:26], r['lean'], r['verdict'], str(r['coverage'])[:26], ','.join(r['records']) or '-',
                ','.join(r['fact_records']) or '-', r['matched']))
            for line, text in r['fact_comments']:
                print('      comment @%s: %s' % (line, text))
