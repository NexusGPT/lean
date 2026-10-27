"""lean-py lane B: bounded execution of one unit, parent against candidate, in one process.

    python3 -I langs/py/exec/run.py --parent p.py --candidate c.py --unit <name> [--n 30] [--seed 1] [--out b.json]

Both versions are imported as modules from a temporary copy (importlib, never from the repository's sys.path). Every
import that leaves the file is a recording stub installed in sys.modules: a sibling module keeps its dataclasses and
Protocols (shapes, not behaviour), and its functions and plain classes become recording fakes; any other module is a
recording stub whose calls answer None. Inputs come from the type hints, boundary values first, then seeded draws;
a Protocol-typed parameter is a recording fake. A fake records each request (operation, arguments) and answers from
the seed and the position of the call in the run, the same on both sides; on some inputs a call faults instead of
answering (an exception, FakeFault). A call of the unit observes:
  1. the outcome: the returned value, or the raised exception (type and arguments);
  2. the reachable state of the mutable arguments and the receiver after the call (object graph, identities renamed
     in first-reach order, dict order kept);
  3. the ordered trace of fake requests with their answers;
  4. pending work: none at milestone 1 (no async, no generators).
A difference on any input is a WITNESS with that input and the first differing observation. None on n inputs is
PASS-bounded: n, the seed and the fault policy are stated; it never becomes a proof.
"""
import argparse, ast, dataclasses, importlib.util, json, os, random, shutil, signal, sys, tempfile, types, typing

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from common import Module, LANGUAGE_MODULES, bad_type, class_kind, tstr  # noqa: E402

INTS = [0, 1, -1, 2, -2, 3, 100, -100, 7, 10, -7, 99]
STRS = ['', 'a', 'ab', ' a ', 'count', 'x y', '12', '-3', ' 7 ', 'é', 'total', 'chat']
CALL_SECONDS = 2


class FakeFault(Exception):
    """What a fake raises when the fault draw says the call fails."""


class Timeout(Exception):
    pass


# ----- the run: which side is calling, its trace, its answer stream -----
class Run:
    def __init__(self):
        self.trace = None
        self.rng = None
        self.fault_rate = 0.0
        self.side = None
        self.ns = None

    def start(self, side, ns, seed, fault_rate):
        self.side, self.ns, self.trace = side, ns, []
        self.rng = random.Random(seed)
        self.fault_rate = fault_rate


RUN = Run()


class Gen:
    """Typed value specs: plain data trees, materialised per side (each side's own classes)."""

    def __init__(self, mods):
        self.mods = mods  # Module objects to resolve class names (the unit's module first, then siblings)

    def cls(self, name):
        for m in self.mods:
            ci = m.class_named(name)
            if ci is not None:
                return ci
        return None

    def draw(self, t, rng, i, depth=0):
        k = t[0]
        if k == 'int' or k == 'tvar':
            return ('v', INTS[i] if i < len(INTS) else rng.randint(-1000, 1000))
        if k == 'bool':
            return ('v', [False, True][i % 2] if i < 2 else rng.random() < 0.5)
        if k == 'str':
            if i < len(STRS):
                return ('v', STRS[i])
            return ('v', ''.join(rng.choice('ab -:xyz07') for _ in range(rng.randint(0, 6))))
        if k == 'none':
            return ('v', None)
        if k == 'opt':
            if i == 0 or (i >= 2 and rng.random() < 0.25):
                return ('v', None)
            return self.draw(t[1], rng, max(i - 1, 0), depth)
        if k == 'list':
            n = [0, 1, 2, 3][i] if i < 4 else rng.randint(0, 4)
            if depth >= 3:
                n = 0
            return ('list', [self.draw(t[1], rng, (i + j) if i < 4 else len(INTS) + 1, depth + 1) for j in range(n)])
        if k == 'tuple':
            return ('tuple', [self.draw(x, rng, i, depth + 1) for x in t[1]])
        if k == 'dict':
            n = [0, 1, 2][i] if i < 3 else rng.randint(0, 3)
            items = []
            for j in range(n):
                items.append((self.draw(t[1], rng, (i + j) if i < 3 else 99, depth + 1), self.draw(t[2], rng, (i + 2 * j) if i < 3 else 99, depth + 1)))
            return ('dict', items)
        if k == 'data':
            ci = self.cls(t[1])
            return ('data', t[1], [(f, self.draw(ci.module.hint(a), rng, i, depth + 1)) for f, a, _ in ci.fields])
        if k == 'ext':
            ci = self.cls(t[1])
            if ci is not None and ci.kind == 'plain' and ci.module is self.mods[0]:
                init = ci.methods.get('__init__')
                args = []
                if init is not None:
                    for a in init.args.args[1:]:
                        args.append(self.draw(ci.module.hint(a.annotation), rng, i, depth + 1))
                return ('new', t[1], args)
            return ('fake', t[1])
        raise ValueError(f'no generator for {tstr(t)}')


def materialise(spec, ns, stubs):
    k = spec[0]
    if k == 'v':
        return spec[1]
    if k == 'list':
        return [materialise(x, ns, stubs) for x in spec[1]]
    if k == 'tuple':
        return tuple(materialise(x, ns, stubs) for x in spec[1])
    if k == 'dict':
        return {materialise(a, ns, stubs): materialise(b, ns, stubs) for a, b in spec[1]}
    if k == 'data':
        cls = getattr(ns, spec[1], None) or find_stub_class(stubs, spec[1])
        return cls(**{f: materialise(v, ns, stubs) for f, v in spec[2]})
    if k == 'new':
        cls = getattr(ns, spec[1])
        return cls(*[materialise(a, ns, stubs) for a in spec[2]])
    if k == 'fake':
        return Fake(spec[1], stubs.protocol(spec[1]))
    raise ValueError(spec)


def find_stub_class(stubs, name):
    for m in stubs.modules.values():
        if hasattr(m, name):
            return getattr(m, name)
    raise KeyError(name)


# ----- fakes -----
class Fake:
    """A recording fake for a Protocol (or an outside class): each method call is a request in the trace."""

    def __init__(self, name, proto):
        object.__setattr__(self, '_name', name)
        object.__setattr__(self, '_proto', proto)  # (ClassInfo, Gen) or None

    def __getattr__(self, attr):
        name, proto = self._name, self._proto
        ret = None
        if proto is not None:
            ci, gen = proto
            md = ci.methods.get(attr)
            if md is None:
                raise AttributeError(f'{name} has no method {attr}')
            ret = ci.module.hint(md.returns) if md.returns is not None else ('none',)
        return lambda *a, **kw: answer(f'{name}.{attr}', a, kw, ret, proto[1] if proto else None)

    def __repr__(self):
        return f'<fake {self._name}>'


def answer(op, args, kwargs, ret, gen):
    """Record a request; answer from the run's stream (the same on both sides at the same position), or fault."""
    RUN.trace.append([op, canon(list(args) + ([dict(kwargs)] if kwargs else []))])
    if RUN.rng.random() < RUN.fault_rate:
        RUN.trace[-1].append('fault')
        raise FakeFault(op)
    if ret is None or ret == ('none',) or gen is None:
        RUN.trace[-1].append(None)
        return None
    spec = gen.draw(ret, RUN.rng, RUN.rng.randint(0, 12))
    val = materialise(spec, RUN.ns, STUBS)
    RUN.trace[-1].append(canon(val))
    return val


class Stubs:
    """The modules a side imports from outside its file: built once, shared by both sides."""

    def __init__(self, base_dir):
        self.base = base_dir
        self.modules = {}
        self.parsed = {}

    def module_ast(self, name):
        if name not in self.parsed:
            p = os.path.join(self.base, *name.split('.')) + '.py'
            self.parsed[name] = Module(p) if os.path.isfile(p) else None
        return self.parsed[name]

    def protocol(self, cname):
        for name in list(self.parsed):
            m = self.parsed[name]
            if m is not None and cname in m.classes:
                return (m.classes[cname], Gen([m] + [x for x in self.parsed.values() if x is not None and x is not m]))
        if UNIT_MOD is not None and cname in UNIT_MOD.classes:
            return (UNIT_MOD.classes[cname], Gen([UNIT_MOD] + [x for x in self.parsed.values() if x is not None]))
        return None

    def build(self, name):
        if name in self.modules:
            return self.modules[name]
        mod = types.ModuleType(name)
        mod.__lean_stub__ = True
        self.modules[name] = mod
        sys.modules[name] = mod
        m = self.module_ast(name)
        if m is None:
            mod.__getattr__ = lambda attr: Fake(f'{name}.{attr}', None)
            return mod
        ns = mod.__dict__
        for st in m.tree.body:
            if isinstance(st, (ast.Import, ast.ImportFrom)):
                for a in st.names:
                    src = (st.module if isinstance(st, ast.ImportFrom) else a.name) or ''
                    top = src.split('.')[0]
                    if top in LANGUAGE_MODULES or top in sys.stdlib_module_names:
                        exec(compile(ast.Module(body=[st], type_ignores=[]), m.path, 'exec'), ns)
                    else:
                        sub = self.build(src)
                        ns[a.asname or (a.name if isinstance(st, ast.ImportFrom) else a.name.split('.')[0])] = getattr(sub, a.name) if isinstance(st, ast.ImportFrom) else sub
            elif isinstance(st, ast.ClassDef):
                kind = class_kind(st)
                if kind in ('data', 'protocol'):
                    exec(compile(ast.Module(body=[st], type_ignores=[]), m.path, 'exec'), ns)
                else:
                    ns[st.name] = fake_class(name, st, m)
            elif isinstance(st, (ast.FunctionDef, ast.AsyncFunctionDef)):
                ret = m.hint(st.returns) if st.returns is not None else ('none',)
                ns[st.name] = (lambda op, r: (lambda *a, **kw: answer(op, a, kw, r, Gen([m] + [x for x in self.parsed.values() if x is not None]))))(f'{name}.{st.name}', ret)
            elif isinstance(st, ast.Assign):
                try:
                    exec(compile(ast.Module(body=[st], type_ignores=[]), m.path, 'exec'), ns)
                except Exception:  # a value the stub cannot build: reading it is a fake
                    for t in st.targets:
                        if isinstance(t, ast.Name):
                            ns[t.id] = Fake(f'{name}.{t.id}', None)
        return mod


def fake_class(modname, node, m):
    """A plain class of another module: its static methods and its instances' methods are recording fakes."""
    attrs = {}
    gen = lambda: Gen([m] + [x for x in STUBS.parsed.values() if x is not None])
    for f in node.body:
        if isinstance(f, (ast.FunctionDef, ast.AsyncFunctionDef)):
            ret = m.hint(f.returns) if f.returns is not None else ('none',)
            op = f'{modname}.{node.name}.{f.name}'
            if 'staticmethod' in [d.id for d in f.decorator_list if isinstance(d, ast.Name)]:
                attrs[f.name] = staticmethod((lambda op, r: (lambda *a, **kw: answer(op, a, kw, r, gen())))(op, ret))
            elif f.name != '__init__':
                attrs[f.name] = (lambda op, r: (lambda self, *a, **kw: answer(op, a, kw, r, gen())))(op, ret)
    attrs['__init__'] = lambda self, *a, **kw: RUN.trace.append([f'{modname}.{node.name}()', canon(list(a)), None])
    return type(node.name, (), attrs)


STUBS = None
UNIT_MOD = None


# ----- observation -----
def canon(v, seen=None):
    """A value as a comparable tree: identities renamed in first-reach order, dict order kept."""
    seen = {} if seen is None else seen
    if v is None or isinstance(v, (bool, int, str)):
        return v
    if isinstance(v, float):
        return ['float', repr(v)]
    if isinstance(v, BaseException):
        return ['exception', type(v).__name__, canon(list(v.args), seen)]
    if isinstance(v, Fake):
        key = id(v)
        if key not in seen:
            seen[key] = len(seen)
        return ['fake', v._name, seen[key]]
    if isinstance(v, (list, tuple)):
        key = id(v)
        if isinstance(v, list):
            if key in seen:
                return ['ref', seen[key]]
            seen[key] = len(seen)
        return [type(v).__name__, [canon(x, seen) for x in v]]
    if isinstance(v, dict):
        key = id(v)
        if key in seen:
            return ['ref', seen[key]]
        seen[key] = len(seen)
        return ['dict', [[canon(a, seen), canon(b, seen)] for a, b in v.items()]]
    if dataclasses.is_dataclass(v) and not isinstance(v, type):
        key = id(v)
        if key in seen:
            return ['ref', seen[key]]
        seen[key] = len(seen)
        return ['data', type(v).__name__, [[f.name, canon(getattr(v, f.name), seen)] for f in dataclasses.fields(v)]]
    if hasattr(v, '__dict__') and not isinstance(v, (type, types.ModuleType, types.FunctionType)):
        key = id(v)
        if key in seen:
            return ['ref', seen[key]]
        seen[key] = len(seen)
        return ['object', type(v).__name__, [[k, canon(x, seen)] for k, x in vars(v).items()]]
    return ['opaque', type(v).__name__]


def on_alarm(signum, frame):
    raise Timeout()


def observe(side, ns, unit, spec_args, recv_spec, seed, fault_rate):
    """Run one call on one side; return the observation."""
    RUN.start(side, ns, seed, fault_rate)
    signal.signal(signal.SIGALRM, on_alarm)
    outcome, args, recv = None, None, None
    cname, mname = unit.split('.', 1) if '.' in unit else (None, unit)
    try:  # the setup: arguments and receiver; a setup that raises is outside the unit's domain, never its observation
        signal.setitimer(signal.ITIMER_REAL, CALL_SECONDS)
        try:
            args = [materialise(a, ns, STUBS) for a in spec_args]
            if cname is not None and mname != '__init__' and recv_spec is not None:
                recv = materialise(recv_spec, ns, STUBS)
        finally:
            signal.setitimer(signal.ITIMER_REAL, 0)
    except BaseException as e:
        return {'setup': f'{type(e).__name__}: {e}'}
    try:
        signal.setitimer(signal.ITIMER_REAL, CALL_SECONDS)
        try:
            if cname is None:
                fn = getattr(ns, mname)
                res = fn(*args)
            else:
                cls = getattr(ns, cname)
                if mname == '__init__':
                    res = cls(*args)
                    recv = res
                    res = None
                elif recv_spec is None:  # a static method
                    res = getattr(cls, mname)(*args)
                else:
                    res = getattr(recv, mname)(*args)
            outcome = ['return', canon(res)]
        finally:
            signal.setitimer(signal.ITIMER_REAL, 0)
    except Timeout:
        outcome = ['timeout']
    except RecursionError:
        outcome = ['raise', 'RecursionError', []]
    except BaseException as e:  # the unit's own exception is an observation
        outcome = ['raise', type(e).__name__, canon(list(e.args))]
    seen = {}
    return {'outcome': outcome, 'state': canon([args, recv], seen), 'trace': RUN.trace, 'pending': []}


def load(path, modname, tmp):
    d = os.path.join(tmp, modname)
    os.makedirs(d, exist_ok=True)
    dst = os.path.join(d, modname + '.py')
    shutil.copyfile(path, dst)
    spec = importlib.util.spec_from_file_location(modname, dst)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[modname] = mod
    spec.loader.exec_module(mod)
    return mod


def install_stubs(paths):
    global STUBS
    STUBS = Stubs(os.path.dirname(os.path.abspath(paths[0])))
    for p in paths:
        m = Module(p)
        for local, (mod, orig, level) in m.imports.items():
            top = mod.split('.')[0]
            if not mod or top in LANGUAGE_MODULES or top in sys.stdlib_module_names:
                continue
            STUBS.build(mod)


def main(argv):
    global UNIT_MOD
    ap = argparse.ArgumentParser()
    ap.add_argument('--parent', required=True)
    ap.add_argument('--candidate', required=True)
    ap.add_argument('--unit', required=True)
    ap.add_argument('--n', type=int, default=30)
    ap.add_argument('--seed', type=int, default=1)
    ap.add_argument('--out')
    a = ap.parse_args(argv)
    result = {'unit': a.unit, 'seed': a.seed, 'lane': 'B'}

    def finish(res):
        res.setdefault('assumptions', ['inputs from the type hints, boundary values first, then seeded draws',
                                       'every import that leaves the file is a recording stub; a fake answers from the seed and the call position, the same on both sides',
                                       'one input in three runs with fake faults (rate 0.5)', f'each call is cut after {CALL_SECONDS} s'])
        text = json.dumps(res, indent=1, default=str)
        if a.out:
            open(a.out, 'w').write(text + '\n')
        print(f'{res["verdict"]}: {a.unit}' + (f' ({res.get("reason")})' if res.get('reason') else '') + (f' on {res.get("inputs")} inputs' if 'inputs' in res else ''))
        return 0
    try:
        pm = Module(a.parent)
    except SyntaxError as e:
        result.update(verdict='REFUSE', kind='load', reason=f'parent: {e}')
        return finish(result)
    UNIT_MOD = pm
    u = pm.unit(a.unit)
    if u is None:
        result.update(verdict='ASK', reason=f'no unit {a.unit} in the parent')
        return finish(result)
    # the typed surface: parameters, and the receiver for a method
    fn = u.node
    params = list(fn.args.args)
    static = 'staticmethod' in [d.id for d in fn.decorator_list if isinstance(d, ast.Name)]
    recv_t = None
    if u.cls is not None and not static:
        params = params[1:]
        if u.method != '__init__':
            recv_t = ('data', u.cls.name) if u.cls.kind == 'data' else ('ext', u.cls.name)
    types_ = []
    for p in params:
        t = pm.hint(p.annotation)
        if bad_type(t):
            result.update(verdict='ASK', reason=f'parameter {p.arg}: no generator for {tstr(t)}')
            return finish(result)
        types_.append(t)
    if fn.args.vararg is not None:
        types_.append(('star', pm.hint(fn.args.vararg.annotation)))
    tmp = tempfile.mkdtemp(prefix='lean-py-b-')
    try:
        install_stubs([a.parent, a.candidate])
        try:
            sides = {'parent': load(a.parent, 'lean_parent', tmp), 'candidate': load(a.candidate, 'lean_candidate', tmp)}
        except BaseException as e:
            result.update(verdict='REFUSE', kind='load', reason=f'{type(e).__name__}: {e}')
            return finish(result)
        gen = Gen([pm] + [m for m in STUBS.parsed.values() if m is not None])
        rng = random.Random(a.seed)
        n, witnesses, timeouts, faults, skipped = 0, [], 0, 0, 0
        for i in range(a.n * 3):
            if n >= a.n:
                break
            specs = []
            for j, t in enumerate(types_):
                if t[0] == 'star':
                    specs.append(('star', gen.draw(('list', t[1]), rng, (i + j) % 6)))
                else:
                    specs.append(gen.draw(t, rng, i if i < 12 else 12 + i, 0) if j == 0 else gen.draw(t, rng, (i + j) % 12 if i < 12 else 12 + i, 0))
            flat = []
            for s in specs:
                if s[0] == 'star':
                    flat += s[1][1]
                else:
                    flat.append(s)
            recv = gen.draw(recv_t, rng, i % 12) if recv_t is not None else None
            fault_rate = 0.5 if i % 3 == 2 else 0.0
            call_seed = a.seed * 100003 + i
            obs = {s: observe(s, ns, a.unit, flat, recv, call_seed, fault_rate) for s, ns in sides.items()}
            if any('setup' in o for o in obs.values()):
                skipped += 1
                continue
            n += 1
            faults += sum(1 for o in obs.values() for r in o['trace'] if len(r) > 2 and r[2] == 'fault')
            if any(o['outcome'] == ['timeout'] for o in obs.values()):
                timeouts += 1
                continue
            for key in ('outcome', 'state', 'trace', 'pending'):
                if obs['parent'][key] != obs['candidate'][key]:
                    witnesses.append({'input': {'args': [spec_text(s) for s in flat], 'receiver': spec_text(recv) if recv else None, 'fault_rate': fault_rate, 'seed': call_seed},
                                      'observation': key, 'parent': obs['parent'][key], 'candidate': obs['candidate'][key]})
                    break
            if witnesses:
                break
        result.update(inputs=n, faults=faults, timeouts=timeouts, skipped=skipped)
        if witnesses:
            result.update(verdict='WITNESS', witnesses=witnesses)
        elif timeouts:
            result.update(verdict='ASK', reason=f'{timeouts} input(s) timed out on a side')
        else:
            if n == 0:
                result.update(verdict='ASK', reason=f'no input passed the setup ({skipped} skipped)')
            else:
                result.update(verdict='PASS-bounded', bound={'inputs': n, 'skipped_setup': skipped, 'seed': a.seed, 'fault_rate': '0.5 on one input in three', 'programs': 'none at milestone 1'})
        return finish(result)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def spec_text(s):
    k = s[0]
    if k == 'v':
        return s[1]
    if k in ('list', 'tuple'):
        return [spec_text(x) for x in s[1]]
    if k == 'dict':
        return {'dict': [[spec_text(a), spec_text(b)] for a, b in s[1]]}
    if k == 'data':
        return {s[1]: {f: spec_text(v) for f, v in s[2]}}
    if k == 'new':
        return {'new ' + s[1]: [spec_text(x) for x in s[2]]}
    if k == 'fake':
        return f'<fake {s[1]}>'
    return str(s)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
