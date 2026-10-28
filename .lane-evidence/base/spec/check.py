"""The checker of the gate: run Dafny on an obligations file and report one row per lemma.

    python3 -I spec/check.py --obligations obligations.dfy
        [--parent p.dfy --candidate c.dfy --scope scope.json --edit edit.json]

With the four inputs, the checker first regenerates the theorem with
spec/theorem.py and requires the obligations file to state exactly that theorem
(every lemma body may differ; nothing else may). A proof of a different or
weaker theorem is refused. Exit 0 only when every lemma is proved.
"""
import argparse, csv, json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import theorem  # noqa: E402

TIME_LIMIT = '60'
BODY_BAN = [r'\bassume\b', r'\{\s*:\s*axiom\b', r'\{\s*:\s*verify\s+false', r'\bextern\b']


def lemma_spans(lines):
    spans, order = {}, []
    for i, l in enumerate(lines, 1):
        m = re.match(r'lemma\s+(\w+)', l)
        if m:
            spans[m.group(1)] = [i, None]
            order.append(m.group(1))
        m = re.match(r'\} // END (\w+)', l)
        if m and m.group(1) in spans:
            spans[m.group(1)][1] = i
    for k, name in enumerate(order):  # support lemmas have no END marker
        if spans[name][1] is None:
            spans[name][1] = spans[order[k + 1]][0] - 1 if k + 1 < len(order) else len(lines)
    return spans


def run_dafny(path, extra=(), timeout=900):
    return subprocess.run(['dafny', 'verify', '--verification-time-limit', TIME_LIMIT, *extra, path],
                          capture_output=True, text=True, timeout=timeout)


def counterexample(path, lemma):
    try:
        r = run_dafny(path, ['--extract-counterexample', '--filter-symbol', lemma], timeout=120)
    except subprocess.TimeoutExpired:
        return None
    out = r.stdout + r.stderr
    m = re.search(r'[Cc]ounterexample[^\n]*\n((?:[^\n]+\n)+)', out)
    return m.group(1).strip() if m and 'Prover error' not in m.group(1) else None


def check(path, derive=None):
    """Return (rows, notes). rows: (lemma, status, detail). status: proved/refuted/timeout/error."""
    text = open(path).read()
    notes = []
    if derive is not None:
        fresh = theorem.generate(*derive)
        if theorem.skeleton(fresh) != theorem.skeleton(text):
            return [('(theorem)', 'error', 'obligations file does not state the theorem generated from the inputs')], notes
    for m in re.finditer(r'\{ // PROOF (\S+)\n(.*?)\} // END \1', text, flags=re.S):
        for pat in BODY_BAN:
            if re.search(pat, theorem.strip_comments(m.group(2))):
                return [(m.group(1), 'error', 'proof body uses a forbidden construct')], notes
    for m in theorem.SUPPORT_RE.finditer(text):
        for pat in BODY_BAN:
            if re.search(pat, theorem.strip_comments(m.group(0))):
                return [('(support)', 'error', 'support block uses a forbidden construct')], notes
    lines = text.split('\n')
    spans = lemma_spans(lines)
    if not spans:
        return [('(file)', 'error', 'no lemma in the obligations file')], notes
    with tempfile.TemporaryDirectory() as td:
        csvp = os.path.join(td, 'r.csv')
        r = run_dafny(path, ['--log-format', f'csv;LogFileName={csvp}'])
        outcomes = {}
        if os.path.exists(csvp):
            for row in csv.DictReader(open(csvp)):
                name = row['TestResult.DisplayName'].split(' ')[0]
                outcomes[name] = row['TestResult.Outcome']
    errors = []
    for m in re.finditer(r'\((\d+),(\d+)\): Error: ([^\n]*)', r.stdout):
        errors.append((int(m.group(1)), m.group(3)))
    rows, used = [], set()
    for name, (a, b) in spans.items():
        mine = [(ln, msg) for ln, msg in errors if a <= ln <= (b or a)]
        used.update(ln for ln, _ in mine)
        o = outcomes.get(name)
        if o == 'Passed' and not mine:
            rows.append((name, 'proved', ''))
        elif o is None and not mine:
            rows.append((name, 'error', 'Dafny gave no verdict for this lemma'))
        else:
            msg = mine[0][1] if mine else 'failed'
            if re.search(r'time|resource', msg, re.I):
                rows.append((name, 'timeout', msg))
            else:
                ce = counterexample(path, name)
                rows.append((name, 'refuted', msg + '; ' + ('counterexample: ' + ce if ce else 'no counterexample offered')))
    for ln, msg in errors:
        if ln not in used:
            rows.append((f'(line {ln})', 'error', msg))
    if r.returncode not in (0, 4) or (r.returncode != 0 and not errors):
        notes.append('dafny exit ' + str(r.returncode) + ': ' + (r.stdout + r.stderr).strip()[-400:])
        if all(x[1] == 'proved' for x in rows):
            rows.append(('(dafny)', 'error', 'unexpected dafny exit ' + str(r.returncode)))
    return rows, notes


def table(rows):
    w = max(len(r[0]) for r in rows)
    return '\n'.join(f'{r[0]:<{w}}  {r[1]:<8}  {r[2]}'.rstrip() for r in rows)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--obligations', required=True)
    for k in ('parent', 'candidate', 'scope', 'edit'):
        ap.add_argument('--' + k)
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args(argv)
    derive = None
    given = [a.parent, a.candidate, a.scope, a.edit]
    if any(given):
        if not all(given):
            print('check: give all of --parent --candidate --scope --edit or none', file=sys.stderr)
            return 2
        try:
            derive = (open(a.parent).read(), open(a.candidate).read(),
                      json.load(open(a.scope)), json.load(open(a.edit)))
            theorem.generate(*derive)
        except theorem.Refusal as e:
            print('check: theorem refused: ' + str(e), file=sys.stderr)
            return 1
    rows, notes = check(a.obligations, derive)
    if a.json:
        print(json.dumps([{'lemma': r[0], 'status': r[1], 'detail': r[2]} for r in rows]))
    else:
        print(table(rows))
        for n in notes:
            print(n, file=sys.stderr)
    return 0 if all(r[1] == 'proved' for r in rows) else 1


if __name__ == '__main__':
    sys.exit(main())
