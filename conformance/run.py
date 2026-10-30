"""Run every language under langs/ against every fixture under fixtures/.

    python3 -I conformance/run.py [lang ...]

A language is a folder langs/<lang>/ holding conformance.json (see
langs/_template/README.md). Folders without it are skipped. The language `dfy`
is built in: Dafny files need no lint and no translation, so the specification
and the runner are tested without a language.

Per language:
  shared   fixtures/shared/<name>/<lang>.<ext>: lint passes; the translation
           verifies with the theorem on the "Theorem" line of the fixture README.
  escapes  every file under fixtures/escapes: lint exits 1.
  cleans   fixtures/cleans/<lang>/**/ (parent, candidate, scope.json, edit.json):
           lint passes on both, every lemma proved.
  bugs     fixtures/bugs/<lang>/**/ (the same plus expected.json): the per-lemma
           outcomes equal expected.json exactly.
  pairs    each folder conformance.json lists under "pairs" (parent, candidate,
           expect.json: scope, equal, b): both sides lint, translate with a shared
           prelude ("pair_translate") and the theorem's lemmas come out as `equal`
           says (true: proved; false or "witness": not proved); lane B ("exec")
           gives the verdict `b` names on each unit, its record has the
           TypeScript shape (a WITNESS names input, args, parent, candidate and
           where.field; a PASS-bounded names bound.n and bound.seed), and no
           proved lemma has a WITNESS on its unit.

Exit 0 only when every language passes. The last line states the result.
"""
import contextlib, io, json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'spec'))
import theorem, check  # noqa: E402

ROWS = []  # (lang, kind, fixture, ok, detail)


def record(lang, kind, name, ok, detail=''):
    ROWS.append((lang, kind, name, ok, detail))


def sub(argv, **kw):
    return [str(a).format(**kw) for a in argv]


class Lang:
    def __init__(self, name, ext, lint=None, translate=None, conf=None):
        self.name, self.ext, self.lint_cmd, self.translate_cmd = name, ext, lint, translate
        conf = conf or {}
        self.pairs = conf.get('pairs', [])
        self.pair_translate_cmd, self.exec_cmd = conf.get('pair_translate'), conf.get('exec')

    def lint(self, src):
        """Return exit code of the lint (0 pass, 1 refused, other = broken)."""
        if self.lint_cmd is None:
            return 0
        r = subprocess.run(sub(self.lint_cmd, src=src, root=ROOT, lang=self.name),
                           cwd=ROOT, capture_output=True, text=True)
        return r.returncode if r.returncode in (0, 1) else 100 + r.returncode

    def translate(self, src, out, suffix):
        if self.translate_cmd is None:  # built-in dfy: identity
            open(out, 'w').write(open(src).read())
            return 0, ''
        r = subprocess.run(sub(self.translate_cmd, src=src, out=out, suffix=suffix, root=ROOT, lang=self.name),
                           cwd=ROOT, capture_output=True, text=True)
        err = (r.stdout + r.stderr).strip()[-300:]
        if r.returncode == 0 and not os.path.exists(out):
            return 1, 'translate produced no output file'
        return r.returncode, err


def load_langs(wanted):
    langs = []
    ld = os.path.join(ROOT, 'langs')
    for d in sorted(os.listdir(ld)):
        if d.startswith('_') or not os.path.isdir(os.path.join(ld, d)):
            continue
        cj = os.path.join(ld, d, 'conformance.json')
        if wanted and d not in wanted:
            continue
        if not os.path.exists(cj):
            record(d, 'lang', '-', None, 'no conformance.json: skipped')
            continue
        try:
            c = json.load(open(cj))
            langs.append(Lang(d, c['ext'].lstrip('.'), c['lint'], c['translate'], c))
        except (ValueError, KeyError) as e:
            record(d, 'lang', 'conformance.json', False, f'unreadable: {e!r}')
    if not wanted or 'dfy' in wanted:
        langs.append(Lang('dfy', 'dfy'))
    return langs


def fixture_dirs(base):
    """A folder holding parent.* is one fixture; else each subfolder is."""
    if not os.path.isdir(base):
        return []
    if any(f.startswith('parent.') for f in os.listdir(base)):
        return [base]
    return [os.path.join(base, d) for d in sorted(os.listdir(base))
            if os.path.isdir(os.path.join(base, d))]


def theorem_line(readme):
    for l in open(readme).read().split('\n'):
        if l.startswith('Theorem'):
            m = re.search(r'`([^`]+)`', l)
            if m:
                return m.group(1)
    return None


def shared(lang):
    base = os.path.join(ROOT, 'fixtures', 'shared')
    for name in sorted(os.listdir(base)) if os.path.isdir(base) else []:
        d = os.path.join(base, name)
        src = os.path.join(d, f'{lang.name}.{lang.ext}')
        if not os.path.isfile(src):
            record(lang.name, 'shared', name, False, f'no {lang.name}.{lang.ext}')
            continue
        if lang.lint(src) != 0:
            record(lang.name, 'shared', name, False, 'lint refused or broke')
            continue
        expr = theorem_line(os.path.join(d, 'README.md'))
        if not expr:
            record(lang.name, 'shared', name, False, 'no Theorem line in README.md')
            continue
        with tempfile.TemporaryDirectory() as td:
            out = os.path.join(td, 'f.dfy')
            rc, err = lang.translate(src, out, '')
            if rc != 0:
                record(lang.name, 'shared', name, False, 'translate failed: ' + err)
                continue
            text = open(out).read()
            try:
                funcs = theorem.parse_functions(text, None, 'translation')
                theorem.check_forbidden(text, 'translation')
                fn = next(f for f in re.findall(r'[A-Za-z_]\w*(?=\()', expr) if f in funcs)
            except (theorem.Refusal, StopIteration) as e:
                record(lang.name, 'shared', name, False, f'translation unusable: {e}')
                continue
            sig = funcs[fn]
            params = ', '.join(f'{n}: {t}' for n, t in sig['params'])
            obl = os.path.join(td, 'o.dfy')
            open(obl, 'w').write(text.rstrip('\n') + f'\n// BEGIN THEOREM\nlemma Theorem_{name}({params})\n'
                                 f'  ensures {expr}\n{{ // PROOF Theorem_{name}\n}} // END Theorem_{name}\n// END THEOREM\n')
            rows, _ = check.check(obl)
            bad = [f'{r[0]} {r[1]}' for r in rows if r[1] != 'proved']
            record(lang.name, 'shared', name, not bad, '; '.join(bad))


def escapes(lang):
    base = os.path.join(ROOT, 'fixtures', 'escapes')
    own = os.path.join(base, lang.name)
    files = []
    scan = own if os.path.isdir(own) else base
    for dp, _, fs in os.walk(scan):
        files += [os.path.join(dp, f) for f in sorted(fs) if f.endswith('.' + lang.ext)]
    for f in files:
        rel = os.path.relpath(f, base)
        rc = lang.lint(f)
        record(lang.name, 'escape', rel, rc == 1, '' if rc == 1 else f'lint exit {rc}, wanted 1')


def pipeline(lang, d):
    """Return ([(lemma, status)], error) for one change fixture folder."""
    files = {k: next((os.path.join(d, f) for f in os.listdir(d) if f.startswith(k + '.')), None)
             for k in ('parent', 'candidate')}
    scope, edit = os.path.join(d, 'scope.json'), os.path.join(d, 'edit.json')
    if not all(files.values()) or not os.path.exists(scope) or not os.path.exists(edit):
        return None, 'fixture incomplete (parent, candidate, scope.json, edit.json)'
    for k, f in files.items():
        if lang.lint(f) != 0:
            return None, f'lint refused the {k}'
    with tempfile.TemporaryDirectory() as td:
        outs = {}
        for k, f in files.items():
            outs[k] = os.path.join(td, k + '.dfy')
            rc, err = lang.translate(f, outs[k], k)
            if rc != 0:
                return None, f'translate of the {k} failed: {err}'
        obl = os.path.join(td, 'obligations.dfy')
        with contextlib.redirect_stdout(io.StringIO()):
            rc = theorem.main(['--parent', outs['parent'], '--candidate', outs['candidate'],
                           '--scope', scope, '--edit', edit, '--out', obl])
        if rc != 0:
            return None, 'theorem generator refused the inputs'
        pj = os.path.join(d, 'proofs.json')
        if os.path.exists(pj):  # the stand-in for the prover: bodies and support lemmas
            pr = json.load(open(pj))
            try:
                filled = theorem.fill(open(obl).read(), pr.get('support', ''), pr.get('bodies'))
                open(obl, 'w').write(filled)
            except theorem.Refusal as e:
                return None, str(e)
        derive = (open(outs['parent']).read(), open(outs['candidate']).read(),
                  json.load(open(scope)), json.load(open(edit)))
        rows, _ = check.check(obl, derive)
        return [(r[0], r[1]) for r in rows], None


def changes(lang, kind):
    base = os.path.join(ROOT, 'fixtures', kind, lang.name)
    for d in fixture_dirs(base):
        name = os.path.relpath(d, os.path.join(ROOT, 'fixtures', kind))
        res, err = pipeline(lang, d)
        if err:
            record(lang.name, kind[:-1], name, False, err)
            continue
        if kind == 'cleans':
            bad = [f'{l} {s}' for l, s in res if s != 'proved']
            record(lang.name, 'clean', name, not bad, '; '.join(bad))
        else:
            exp = json.load(open(os.path.join(d, 'expected.json')))
            got = dict(res)
            diff = [f'{l}: wanted {exp.get(l)}, got {got.get(l)}' for l in sorted(set(exp) | set(got))
                    if exp.get(l) != got.get(l)]
            record(lang.name, 'bug', name, not diff, '; '.join(diff))


OBSERVATIONS = {'outcome', 'state', 'trace', 'pending'}


def record_shape(rec):
    """The lane B record, read the same way for every language (the TypeScript shape): '' when it holds, else why not."""
    v = rec.get('verdict')
    if not isinstance(v, str):
        return 'no verdict'
    if v == 'WITNESS':
        ws = rec.get('witnesses')
        if not isinstance(ws, list) or not ws:
            return 'a WITNESS without witnesses'
        for w in ws:
            missing = [k for k in ('input', 'args', 'parent', 'candidate') if k not in w]
            if missing:
                return 'a witness without ' + ', '.join(missing)
            if not isinstance(w.get('where'), dict) or 'field' not in w['where']:
                return 'a witness without where.field (the first observation that differs)'
    if v == 'PASS-bounded':
        b = rec.get('bound')
        if not isinstance(b, dict) or not isinstance(b.get('n'), int) or b['n'] <= 0 or 'seed' not in b:
            return 'a PASS-bounded without bound.n and bound.seed'
    return ''


def dafny_unit(name):
    """The Dafny name of a source unit, by the rule every language shares (langs/py/README.md, "Units and names"):
    snake_case, a method is <class>_<method>, a constructor <class>_constructor."""
    parts = name.split('.')
    if len(parts) == 2 and parts[1] in ('__init__', 'constructor'):
        parts[1] = 'constructor'
    snake = lambda x: re.sub(r'(?<=[a-z0-9])([A-Z])', r'_\1', x).lower()
    return '_'.join(snake(p) for p in parts)


def pair_run(lang, d, td):
    """Lint, translate with a shared prelude, generate the theorem, check it. Returns ({lemma: status}, error)."""
    exp = json.load(open(os.path.join(d, 'expect.json')))
    for k in ('parent', 'candidate'):
        if lang.lint(os.path.join(d, f'{k}.{lang.ext}')) != 0:
            return None, f'lint refused the {k}'

    def tr(k, eff):
        argv = sub(lang.pair_translate_cmd, src=os.path.join(d, f'{k}.{lang.ext}'), out=os.path.join(td, f'{k}.dfy'),
                   prelude=os.path.join(td, f'{k}.pre.dfy'), suffix=k, effectful=eff, root=ROOT, lang=lang.name)
        r = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True)
        return r.returncode, (r.stdout + r.stderr).strip()[-300:]

    def effectful(k):  # the units the side reads with the world: both sides agree on them before the theorem
        m = re.search(r'^// EFFECTFUL: (.*)$', open(os.path.join(td, f'{k}.dfy')).read(), re.M)
        return m.group(1).strip() if m else ''
    rc, err = tr('parent', '')
    if rc != 0:
        return None, f'translate of the parent failed: {err}'
    rc, err = tr('candidate', effectful('parent'))
    if rc != 0:
        return None, f'translate of the candidate failed: {err}'
    if effectful('candidate') != effectful('parent'):
        rc, err = tr('parent', effectful('candidate'))
        if rc != 0:
            return None, f'translate of the parent failed: {err}'
    scope, edit, obl = (os.path.join(td, f) for f in ('scope.json', 'edit.json', 'obligations.dfy'))
    json.dump({'functions': {f: {'in_scope': 'false'} for f in exp['scope']}}, open(scope, 'w'))
    open(edit, 'w').write('{}')
    with contextlib.redirect_stdout(io.StringIO()):
        rc = theorem.main(['--parent', os.path.join(td, 'parent.dfy'), '--candidate', os.path.join(td, 'candidate.dfy'),
                           '--scope', scope, '--edit', edit, '--out', obl])
    if rc != 0:
        return None, 'theorem generator refused the inputs'
    rows, _ = check.check(obl)
    return {r[0]: r[1] for r in rows}, None


def pairs(lang):
    if not lang.pairs:
        return
    if not lang.pair_translate_cmd or not lang.exec_cmd:
        record(lang.name, 'pair', '-', False, 'conformance.json lists pairs without "pair_translate" and "exec"')
        return
    for rel in lang.pairs:
        d = os.path.join(ROOT, rel)
        name = os.path.basename(rel.rstrip('/'))
        try:
            exp = json.load(open(os.path.join(d, 'expect.json')))
        except (OSError, ValueError) as e:
            record(lang.name, 'pair', name, False, f'expect.json unreadable: {e}')
            continue
        with tempfile.TemporaryDirectory() as td:
            got, err = pair_run(lang, d, td)
            if err:
                record(lang.name, 'pair', name, False, err)
                continue
            for f, want in exp['equal'].items():
                status = got.get(f'Equal_{f}')
                ok = status is not None and ((status == 'proved') == (want is True))
                record(lang.name, 'pair', f'{name} Equal_{f}', ok, f'{"must prove" if want is True else "must not prove"}: {status}')
            verdicts = {}
            for unit, want in exp.get('b', {}).items():
                out = os.path.join(td, 'b.json')
                argv = sub(lang.exec_cmd, parent=os.path.join(d, f'parent.{lang.ext}'), candidate=os.path.join(d, f'candidate.{lang.ext}'),
                           unit=unit, out=out, root=ROOT, lang=lang.name)
                r = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True)
                try:
                    rec = json.load(open(out))
                    os.remove(out)
                except (OSError, ValueError):
                    record(lang.name, 'pair', f'{name} lane B {unit}', False, f'no record (exit {r.returncode}): {(r.stdout + r.stderr).strip()[-160:]}')
                    continue
                verdicts[dafny_unit(unit)] = rec.get('verdict')
                shape = record_shape(rec)
                record(lang.name, 'pair', f'{name} lane B {unit}', rec.get('verdict') == want and not shape,
                       f'{"must witness" if want == "WITNESS" else "wants " + want}: {rec.get("verdict")}' + (f'; record: {shape}' if shape else ''))
            for f, want in exp['equal'].items():  # a proof the bounded run contradicts is a false proof
                if got.get(f'Equal_{f}') == 'proved':
                    v = verdicts.get(f)
                    record(lang.name, 'pair', f'{name} Equal_{f} vs lane B', v is not None and v != 'WITNESS',
                           f'proved; lane B: {v}' if v else 'proved, but expect.json runs no lane B on this unit')


def main(argv):
    langs = load_langs(set(argv))
    for lang in langs:
        if lang.name != 'dfy':
            shared(lang)
            escapes(lang)
        changes(lang, 'cleans')
        changes(lang, 'bugs')
        pairs(lang)
    w = max([len(f'{r[0]}/{r[1]}') for r in ROWS] + [8])
    v = max([len(r[2]) for r in ROWS] + [8])
    for lang, kind, name, ok, detail in ROWS:
        mark = 'skip' if ok is None else ('ok' if ok else 'FAIL')
        print(f'{lang + "/" + kind:<{w}}  {name:<{v}}  {mark:<4}  {detail}'.rstrip())
    ran = [r for r in ROWS if r[3] is not None]
    fails = [r for r in ran if not r[3]]
    verdict = 'PASS' if ran and not fails else 'FAIL'
    print(f'conformance: {verdict}, {len(ran) - len(fails)} of {len(ran)} checks passed, '
          f'languages: {", ".join(l.name for l in langs) or "none"}')
    return 0 if verdict == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
