"""lean-py translate: the functions of a Python file as Dafny, the shared core form.

    python3 -I langs/py/translate/translate.py <file.py> --core --out <out.dfy> [--prelude <pre.dfy>]
        [--suffix parent|candidate] [--effectful u1,u2] [--only u1,u2]

The same conventions as the TypeScript translator, so spec/theorem.py and its prelude merge apply unchanged:
snake_case names with the side suffix (`grade_parent`), a method is `<class>_<method>` (`__init__` is
`<class>_constructor`), a loop is a private recursive helper `<unit>_loop<k>` with a measure, `Option<T>` for
Optional, `seq<T>` for list, `map<K,V>` for dict, a datatype per dataclass, and the world: a unit that touches the
outside, raises, or uses an operation that may raise takes `wld: World` first and returns `(World, R)`; a raised
exception is a fault on the world (`ext_raise_World_Any`), checked after every step that may fault, the way the
TypeScript translator reads an exact `try`.

Exit 0: file written. Exit 1: outside the subset (each finding `file:line:col rule message`).
"""
import ast, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from common import Module, dn, dafny_name, snake, bad_type, tstr, decreases_hint, BUILTIN_EXC, LANGUAGE_MODULES, opt, immutable, dataclass_hook  # noqa: E402


class Unsupported(Exception):
    def __init__(self, node, rule, msg):
        super().__init__(msg)
        self.node, self.rule, self.msg = node, rule, msg

    def where(self, path):
        line = getattr(self.node, 'lineno', 1) or 1
        col = (getattr(self.node, 'col_offset', 0) or 0) + 1
        return f'{path}:{line}:{col}  {self.rule}  {self.msg}'


class NeedsWorld(Exception):
    """A unit read as pure met a step of the world: it is re-read as a world unit."""


def fail(node, rule, msg):
    raise Unsupported(node, rule, msg)


INT, BOOL, STR, NONE = ('int',), ('bool',), ('str',), ('none',)
NONELIT = ('nonelit',)
MUTATORS = {'append', 'extend', 'insert', 'pop', 'remove', 'clear', 'sort', 'reverse', 'update', 'setdefault',
            'popitem', 'add', 'discard', '__setitem__'}
STR_UNINTERP = {'upper', 'lower', 'strip', 'lstrip', 'rstrip', 'title', 'capitalize', 'casefold'}
OPS = {'Add': '+', 'Sub': '-', 'Mult': '*', 'FloorDiv': '//', 'Mod': '%', 'Pow': '**', 'BitOr': '|', 'BitAnd': '&'}


def indent(s, n=1):
    return '\n'.join(('  ' * n + l) if l else l for l in s.split('\n'))


def wrap(s):
    s = s.strip('\n')
    return f'(\n{indent(s)}\n)' if s.lstrip().startswith('var ') or '\n' in s else s


def tup(xs):
    return xs[0] if len(xs) == 1 else '(' + ', '.join(xs) + ')'


def mangle(t):
    return re.sub(r'[^A-Za-z0-9]+', '_', t).strip('_')


def has_tvar(t):
    """Does a type mention a type parameter?"""
    if not isinstance(t, tuple):
        return False
    if t and t[0] == 'tvar':
        return True
    return any(has_tvar(x) if isinstance(x, tuple) else (isinstance(x, list) and any(has_tvar(y) for y in x)) for x in t[1:])


def subst(t, sb):
    """A type with its type parameters replaced by the types a call binds them to."""
    if t is None:
        return t
    k = t[0]
    if k == 'tvar':
        return sb.get(t[1], t)
    if k in ('list', 'opt'):
        return (k, subst(t[1], sb))
    if k == 'tuple':
        return (k, [subst(x, sb) for x in t[1]])
    if k == 'dict':
        return (k, subst(t[1], sb), subst(t[2], sb))
    return t


def match(pt, at, sb):
    """Bind the type parameters of a parameter type from an argument type (first binding wins)."""
    if pt is None or at is None:
        return
    if pt[0] == 'tvar':
        if pt[1] not in sb and at not in (('nonelit',),) and not (at[0] in ('list', 'dict') and at[1] is None):
            sb[pt[1]] = at
        return
    if pt[0] == at[0]:
        if pt[0] in ('list', 'opt'):
            match(pt[1], at[1], sb)
        elif pt[0] == 'dict':
            match(pt[1], at[1], sb)
            match(pt[2], at[2], sb)
        elif pt[0] == 'tuple' and len(pt[1]) == len(at[1]):
            for a, b in zip(pt[1], at[1]):
                match(a, b, sb)
    elif pt[0] == 'opt':
        match(pt[1], at, sb)


class Env:
    """What is defined at a point of a function: name -> type; the narrowed optionals; list facts."""

    def __init__(self, types=None, narrowed=None, facts=None):
        self.types = dict(types or {})
        self.narrowed = set(narrowed or ())
        self.facts = dict(facts or {})  # list name -> (element name, condition node, lambda text): filter provenance

    def copy(self):
        return Env(self.types, self.narrowed, self.facts)

    def define(self, name, t):
        self.types[name] = t
        self.narrowed.discard(name)
        self.facts.pop(name, None)


class Ctx:
    """How control leaves the statement list being translated."""

    def __init__(self, world, ret, fault, brk=None, cont=None, rtype=None):
        self.world, self.ret, self.fault, self.brk, self.cont, self.rtype = world, ret, fault, brk, cont, rtype


class Translator:
    def __init__(self, path, suffix='', effectful=(), only=None):
        self.path = path
        self.mod = Module(path)
        self.sfx = f'_{suffix}' if suffix else ''
        self.prelude = {}  # name -> text, in first-use order
        self.forced = set(effectful)
        self.only = only
        self.units = {u.name: u for u in self.mod.units()}
        self.world = set(self.forced) & set(self.units)
        self.recursive = set()
        self.fields = {}  # plain class -> {field: type}
        self._last_filter = None

    # ----- the prelude -----
    def block(self, name, text):
        if name not in self.prelude:
            self.prelude[name] = text
        return name

    def need_option(self):
        self.block('Option', 'datatype Option<T> = None | Some(value: T)')

    def need_world(self):
        self.need_option()
        self.block('Unit', 'datatype Unit = Unit')
        self.block('WorldHistory', 'type WorldHistory')
        self.block('Any', 'type Any(==)')
        self.block('World', 'datatype World = World(history: WorldHistory, fault: Option<Any>)')
        self.block('ext_no_fault_value', 'function ext_no_fault_value(): Any')
        self.block('ext_faulted_World', 'function ext_faulted_World(a0: World): bool { a0.fault.Some? }')
        self.block('ext_fault_value_World', 'function ext_fault_value_World(a0: World): Any { if a0.fault.Some? then a0.fault.value else ext_no_fault_value() }')
        self.block('ext_clear_fault_World', 'function ext_clear_fault_World(a0: World): World { World(a0.history, None) }')
        self.block('ext_raise_World_Any', 'function ext_raise_World_Any(a0: World, a1: Any): World { World(a0.history, Some(a1)) }')

    def external(self, name, params, ret):
        """A bodiless function in the prelude, the same on both sides; returns its name."""
        ps = ', '.join(f'a{i}: {p}' for i, p in enumerate(params))
        self.block(name, f'function {name}({ps}): {ret}')
        return name

    def fault_result(self, t):
        d = self.dtype(t)
        if self.tvars_in(d):
            self.block('ext_fault_result_any', 'function ext_fault_result_any<T>(): T')
            return f'ext_fault_result_any<{d}>()'
        return self.external(f'ext_fault_result_{mangle(d)}', [], d) + '()'

    def exc_value(self, cls, msg_text):
        self.need_world()
        if msg_text is None:
            return self.external(f'ext_exc_{cls}', [], 'Any') + '()'
        return self.external(f'ext_exc_{cls}_string', ['string'], 'Any') + f'({msg_text})'

    def raise_text(self, cls, msg_text=None):
        return f'ext_raise_World_Any(wld, {self.exc_value(cls, msg_text)})'

    def helper(self, name):
        H = {
            'PyIndexOk': 'function PyIndexOk<T>(s: seq<T>, i: int): bool { -|s| <= i < |s| }',
            'PyAt': 'function PyAt<T>(s: seq<T>, i: int): T\n  requires -|s| <= i < |s|\n{ s[if i < 0 then |s| + i else i] }',
            'PyClamp': 'function PyClamp(n: int, i: int): int { if i < 0 then (if n + i < 0 then 0 else n + i) else if i > n then n else i }',
            'PySlice': 'function PySlice<T>(s: seq<T>, lo: int, hi: int): seq<T>\n{ var a := PyClamp(|s|, lo); var b := PyClamp(|s|, hi); if a < b then s[a..b] else [] }',
            'PyFloorDiv': 'function PyFloorDiv(a: int, b: int): int\n  requires b != 0\n{ if b > 0 then a / b else (if a % b == 0 then a / b else a / b - 1) }',
            'PyMod': 'function PyMod(a: int, b: int): int\n  requires b != 0\n{ a - b * PyFloorDiv(a, b) }',
            'PyPow': 'function PyPow(b: int, e: nat): int\n  decreases e\n{ if e == 0 then 1 else b * PyPow(b, e - 1) }',
            'PyFilter': 'function PyFilter<T>(s: seq<T>, p: T -> bool): (r: seq<T>)\n  ensures |r| <= |s|\n  ensures forall i :: 0 <= i < |r| ==> p(r[i])\n  decreases |s|\n{ if |s| == 0 then [] else (if p(s[0]) then [s[0]] else []) + PyFilter(s[1..], p) }',
            'PyMap': 'function PyMap<T, U>(s: seq<T>, f: T -> U): (r: seq<U>)\n  ensures |r| == |s|\n  decreases |s|\n{ if |s| == 0 then [] else [f(s[0])] + PyMap(s[1..], f) }',
            'PySum': 'function PySum(s: seq<int>): int\n  decreases |s|\n{ if |s| == 0 then 0 else s[0] + PySum(s[1..]) }',
            'PyStartsWith': 'function PyStartsWith(s: string, p: string): bool { |p| <= |s| && s[..|p|] == p }',
            'PyEndsWith': 'function PyEndsWith(s: string, p: string): bool { |p| <= |s| && s[|s| - |p|..] == p }',
            'PyContains': 'function PyContains(s: string, t: string): bool\n  decreases |s|\n{ PyStartsWith(s, t) || (|s| > 0 && PyContains(s[1..], t)) }',
            'PyJoin': 'function PyJoin(sep: string, xs: seq<string>): string\n  decreases |xs|\n{ if |xs| == 0 then "" else if |xs| == 1 then xs[0] else xs[0] + sep + PyJoin(sep, xs[1..]) }',
        }
        deps = {'PySlice': ['PyClamp'], 'PyMod': ['PyFloorDiv'], 'PyContains': ['PyStartsWith']}
        for d in deps.get(name, []):
            self.helper(d)
        self.block(name, H[name])
        return name

    # ----- types -----
    def check_type(self, t, node):
        b = bad_type(t)
        if b:
            fail(node, b[0], b[1])
        return t

    def dtype(self, t):
        k = t[0]
        if k == 'int':
            return 'int'
        if k == 'bool':
            return 'bool'
        if k == 'str':
            return 'string'
        if k in ('none', 'nonelit'):
            self.block('Unit', 'datatype Unit = Unit')
            return 'Unit'
        if k == 'list':
            return f'seq<{self.dtype(t[1]) if t[1] else "int"}>'
        if k == 'tuple':
            return '(' + ', '.join(self.dtype(x) for x in t[1]) + ')'
        if k == 'dict':
            if not self.exact_eq(t[1]):
                raise Unsupported(None, 'value-equality', f'a dict keyed by {tstr(t[1])} finds keys by __eq__ and __hash__: key it by a plain value')
            return f'map<{self.dtype(t[1])}, {self.dtype(t[2])}>'
        if k == 'opt':
            self.need_option()
            return f'Option<{self.dtype(t[1])}>'
        if k == 'tvar':
            return t[1]
        if k == 'data':
            self.datatype(t[1])
            return dn(t[1])
        if k == 'ext':
            self.block('Ext_' + t[1], f'type Ext_{t[1]}')
            return 'Ext_' + t[1]
        raise Unsupported(None, 'unsupported-type', f'type {tstr(t)} has no reading')

    def datatype(self, name):
        if ('dt_' + name) in self.prelude:
            return
        ci = self.mod.class_named(name)
        hook = dataclass_hook(ci.node)
        if hook:
            fail(hook[0], 'dataclass-hook', f'{name} defines {hook[1]}: a dataclass that runs its own code on construction, comparison or field access is outside milestone 1')
        self.prelude['dt_' + name] = None  # reserve: a recursive field refers back to the type
        parts = []
        for f, ann, _ in ci.fields:
            ft = ci.module.hint(ann)
            b = bad_type(ft)
            if b:
                fail(ann, b[0], f'field {name}.{f}: {b[1]}')
            parts.append(f'{dn(f)}: {self.dtype(ft)}')
        self.prelude['dt_' + name] = f'datatype {dn(name)} = {dn(name)}({", ".join(parts)})'

    def tvars_in(self, text):
        return [v for v in sorted(self.mod.tvars) if re.search(r'\b' + re.escape(v) + r'\b', text)]

    def exact_eq(self, t):
        k = t[0]
        if k in ('int', 'bool', 'str', 'none', 'nonelit'):
            return True
        if k in ('list', 'opt'):
            return t[1] is None or self.exact_eq(t[1])
        if k == 'tuple':
            return all(self.exact_eq(x) for x in t[1])
        if k == 'dict':
            return self.exact_eq(t[1]) and self.exact_eq(t[2])
        if k == 'data':
            ci = self.mod.class_named(t[1])
            from common import dataclass_eq
            return dataclass_eq(ci.node) and all(self.exact_eq(ci.module.hint(a)) for _, a, _ in ci.fields if ci.module.hint(a) != ('data', t[1]))
        return False

    def unify(self, a, b, node):
        if a == b:
            return a
        if a == NONELIT and b[0] == 'opt':
            return b
        if b == NONELIT and a[0] == 'opt':
            return a
        if a == NONELIT:
            return opt(b)
        if b == NONELIT:
            return opt(a)
        if a[0] == 'opt' and a[1] == b:
            return a
        if b[0] == 'opt' and b[1] == a:
            return b
        if a[0] == 'list' and b[0] == 'list' and (a[1] is None or b[1] is None):
            return a if a[1] is not None else b
        if a[0] == 'dict' and b[0] == 'dict' and (a[1] is None or b[1] is None):
            return a if a[1] is not None else b
        fail(node, 'mixed-types', f'{tstr(a)} and {tstr(b)} meet in one value: give both the same type')

    def coerce(self, text, frm, to, node):
        if frm == to:
            return text
        if frm == NONELIT and to[0] == 'opt':
            self.need_option()
            return 'None'
        if to[0] == 'opt' and frm == to[1]:
            return f'Some({text})'
        if to[0] == 'opt' and frm[0] == 'list' and to[1][0] == 'list' and frm[1] is None:
            return f'Some({text})'
        if frm[0] == 'list' and to[0] == 'list' and frm[1] is None:
            return text
        if frm[0] == 'dict' and to[0] == 'dict' and frm[1] is None:
            return text
        if frm[0] == 'bool' and to[0] == 'int' or frm[0] == 'int' and to[0] == 'bool':
            fail(node, 'mixed-types', 'bool and int are one type in Python and two here: convert explicitly')
        fail(node, 'mixed-types', f'a {tstr(frm)} where {tstr(to)} is expected')

    # ----- classification -----
    def call_graph(self):
        g = {}
        for name, u in self.units.items():
            callees = set()
            for n in ast.walk(u.node):
                if isinstance(n, ast.Call):
                    f = n.func
                    if isinstance(f, ast.Name) and f.id in self.units:
                        callees.add(f.id)
                    elif isinstance(f, ast.Name) and f.id in self.mod.classes and f'{f.id}.__init__' in self.units:
                        callees.add(f'{f.id}.__init__')
                    elif isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name):
                        if f.value.id == 'self' and u.cls is not None and f'{u.cls.name}.{f.attr}' in self.units:
                            callees.add(f'{u.cls.name}.{f.attr}')
                        elif f.value.id in self.mod.classes and f'{f.value.id}.{f.attr}' in self.units:
                            callees.add(f'{f.value.id}.{f.attr}')
                        else:  # a method on a value of a same-file class: every unit of that name is a candidate
                            for un in self.units:
                                if un.endswith('.' + f.attr) and self.units[un].cls is not None:
                                    callees.add(un)
            g[name] = callees
        return g

    def find_recursion(self, g):
        index, low, stack, on, out, counter = {}, {}, [], set(), set(), [0]

        def strong(v):
            index[v] = low[v] = counter[0]
            counter[0] += 1
            stack.append(v)
            on.add(v)
            for w in g.get(v, ()):
                if w not in index:
                    strong(w)
                    low[v] = min(low[v], low[w])
                elif w in on:
                    low[v] = min(low[v], index[w])
            if low[v] == index[v]:
                comp = []
                while True:
                    w = stack.pop()
                    on.discard(w)
                    comp.append(w)
                    if w == v:
                        break
                if len(comp) > 1 or v in g.get(v, ()):
                    out.update(comp)
        for v in g:
            if v not in index:
                strong(v)
        return out

    def class_fields(self, ci):
        """The fields of a plain class: assigned through `self.f` in its methods, typed by the `__init__`
        parameter they come from, an annotation, or a literal."""
        if ci.name in self.fields:
            return self.fields[ci.name]
        out = {}
        for b in ci.node.body:
            if isinstance(b, ast.AnnAssign) and isinstance(b.target, ast.Name):
                out[b.target.id] = ci.module.hint(b.annotation)
        init = ci.methods.get('__init__')
        params = {}
        if init:
            for a in init.args.args[1:]:
                params[a.arg] = ci.module.hint(a.annotation)
        for m in ci.methods.values():
            for n in ast.walk(m):
                tgt, val, ann = None, None, None
                if isinstance(n, ast.Assign) and len(n.targets) == 1:
                    tgt, val = n.targets[0], n.value
                elif isinstance(n, ast.AnnAssign):
                    tgt, val, ann = n.target, n.value, n.annotation
                if isinstance(tgt, ast.Attribute) and isinstance(tgt.value, ast.Name) and tgt.value.id == 'self':
                    f = tgt.attr
                    if ann is not None:
                        out[f] = ci.module.hint(ann)
                    elif f not in out:
                        if m.name == '__init__' and isinstance(val, ast.Name) and val.id in params:
                            out[f] = params[val.id]
                        elif isinstance(val, ast.Constant) and type(val.value) in (int, str, bool):
                            out[f] = {int: INT, str: STR, bool: BOOL}[type(val.value)]
                        else:
                            out[f] = ('unknown', f'field self.{f} without a type: annotate it')
        self.fields[ci.name] = out
        return out

    # ----- the units -----
    def unit_sig(self, u):
        """(params [(name, type, node)], return type, rest param name or None)."""
        fn = u.node
        a = fn.args
        if a.kwarg or a.kwonlyargs:
            fail(fn, 'rest-parameters', '**kwargs and keyword-only parameters are outside milestone 1')
        if a.posonlyargs:
            fail(fn, 'param-form', 'positional-only parameters are outside milestone 1')
        args = list(a.args)
        is_static = 'staticmethod' in [d.id for d in fn.decorator_list if isinstance(d, ast.Name)]
        if u.cls is not None and not is_static:
            if not args or args[0].arg != 'self':
                fail(fn, 'param-form', 'a method takes `self` first')
            args = args[1:]
        ps = []
        for p in args:
            t = self.mod.hint(p.annotation) if p.annotation is not None else ('any',)
            if p.annotation is None:
                fail(p, 'untyped-parameter', f'parameter {p.arg} has no type hint: write its type')
            self.check_type(t, p)
            ps.append((p.arg, t, p))
        rest = None
        if a.vararg:
            if a.vararg.annotation is None:
                fail(a.vararg, 'rest-parameters', f'*{a.vararg.arg} has no type hint: write the element type')
            t = self.check_type(self.mod.hint(a.vararg.annotation), a.vararg)
            ps.append((a.vararg.arg, ('list', t), a.vararg))
            rest = a.vararg.arg
        if fn.returns is None:
            if u.method == '__init__':
                rt = NONE
            else:
                fail(fn, 'untyped-return', f'{u.name} has no return type hint: write `-> T` (or `-> None`)')
        else:
            rt = self.check_type(self.mod.hint(fn.returns), fn.returns)
        return ps, rt, rest

    def defaults(self, u):
        a = u.node.args
        names = [p.arg for p in a.args]
        if u.cls is not None and names and names[0] == 'self':
            names = names[1:]
        out = {}
        for name, d in zip(names[len(names) - len(a.defaults):], a.defaults):
            if not (isinstance(d, ast.Constant) and type(d.value) in (int, str, bool, type(None))):
                fail(d, 'param-form', 'a default other than a literal is evaluated once, at definition: write a literal')
            out[name] = d
        return out

    def self_type(self, u):
        if u.cls is None or u.method in ():
            return None
        fn = u.node
        if 'staticmethod' in [d.id for d in fn.decorator_list if isinstance(d, ast.Name)]:
            return None
        return ('data', u.cls.name) if u.cls.kind == 'data' else ('ext', u.cls.name)

    def is_world(self, name):
        return name in self.world

    def translate_all(self):
        bad = []
        for u in self.units.values():
            if isinstance(u.node, ast.AsyncFunctionDef):
                bad.append(Unsupported(u.node, 'async', f'{u.name} is async: outside milestone 1'))
            elif u.cls is not None and u.cls.kind == 'other':
                bad.append(Unsupported(u.cls.node, 'inheritance', f'class {u.cls.name} inherits or is not a plain class or a dataclass: outside milestone 1'))
        if bad:
            raise bad[0]
        g = self.call_graph()
        self.recursive = self.find_recursion(g)
        order = list(self.units)
        if self.only:
            keep, todo = set(), list(self.only)
            while todo:
                x = todo.pop()
                if x in keep or x not in self.units:
                    continue
                keep.add(x)
                todo.extend(g.get(x, ()))
            order = [n for n in order if n in keep]
        for _ in range(len(self.units) + 2):
            before = set(self.world)
            self.prelude_snapshot = dict(self.prelude)
            texts = {}
            for name in order:
                while True:
                    try:
                        texts[name] = self.emit_unit(self.units[name])
                        break
                    except NeedsWorld:
                        self.world.add(name)
            if self.world == before:
                return [texts[n] for n in order], order
        raise RuntimeError('world classification did not settle')

    def emit_unit(self, u):
        self.counter = 0
        self.loop_counter = 0
        self.loop_depth = 1
        self.helpers = []
        self.cur = u
        a = u.node.args
        self.local_names = {p.arg for p in a.args + a.posonlyargs + a.kwonlyargs} | ({a.vararg.arg} if a.vararg else set()) | self.assigned(u.node.body)
        world = self.is_world(u.name)
        ps, rt, rest = self.unit_sig(u)
        st = self.self_type(u)
        env = Env()
        params = []
        fuel = u.name in self.recursive
        if fuel:
            params.append('fuel: nat')
        if world:
            self.need_world()
            params.append('wld: World')
        if st is not None:
            params.append(f'self: {self.dtype(st)}')
            env.define('self', st)
        for n, t, node in ps:
            params.append(f'{dn(n)}: {self.dtype(t)}')
            env.define(n, t)
        rd = self.dtype(rt)
        RT = f'(World, {rd})' if world else rd
        self.rtype = rt
        name = dafny_name(u.name) + self.sfx
        tp = self.tvars_in(', '.join(params) + ' ' + RT)
        tclause = f'<{", ".join(tp)}>' if tp else ''
        self.unit_tparams = tp
        ctx = Ctx(world, ret=lambda e, v: f'(wld, {v})' if world else v,
                  fault=lambda e: f'(wld, {self.fault_result(rt)})', rtype=rt)
        body = u.node.body
        if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant) and isinstance(body[0].value.value, str):
            body = body[1:]

        def fall(e):
            if rt == NONE:
                return ctx.ret(e, 'Unit')
            fail(u.node, 'missing-return', f'{u.name} can reach its end without `return`: return on every path')
        text = self.tr(body, env, ctx, fall)
        if world:
            text = 'var wld := ext_clear_fault_World(wld);\n' + text
        if fuel:
            if self.tvars_in(rd):
                self.block('ext_fuel_out_any', 'function ext_fuel_out_any<T>(): T')
                out = f'ext_fuel_out_any<{rd}>()'
            else:
                out = self.external(f'ext_fuel_out_{mangle(rd)}', [], rd) + '()'
            text = f'if fuel == 0 then {"(wld, " + out + ")" if world else out} else\n{indent(wrap(text))}'
        head = f'function {name}{tclause}({", ".join(params)}): {RT}'
        spec = '  decreases fuel, 10, 0\n' if fuel else ''
        sig = self.sig_line(u, name)
        return '\n\n'.join(self.helpers + [f'{sig}\n{head}\n{spec}{{\n{indent(text)}\n}}'])

    def sig_line(self, u, name):
        fn = u.node
        a = fn.args
        fold = lambda n: re.sub(r'\s+', ' ', ast.unparse(n)) if n is not None else None
        ds = [None] * (len(a.args) - len(a.defaults)) + list(a.defaults)
        params = [{'name': p.arg, 'type': fold(p.annotation), 'default': fold(d)} for p, d in zip(a.args, ds)]
        if a.vararg:
            params.append({'name': '*' + a.vararg.arg, 'type': fold(a.vararg.annotation), 'default': None})
        sig = {'decorators': [fold(d) for d in fn.decorator_list], 'params': params, 'ret': fold(fn.returns)}
        return f'// SIG {name}: {json.dumps(sig, separators=(",", ":"))}'

    def filter_helper(self, T):
        """The filter of a list of T: one helper per element type with its congruence lemma `<F>_same` (two predicates
        that agree on every element keep the same elements), the vocabulary spec/theorem.py states for two filters of
        one sequence. An element type with a type parameter keeps the generic PyFilter (no lemma: its type is open)."""
        if has_tvar(T):
            return self.helper('PyFilter')
        A = self.dtype(T)
        name = 'PyFilter_' + mangle(A)
        self.block(name, f'function {name}(s: seq<{A}>, p: {A} -> bool): (r: seq<{A}>)\n  ensures |r| <= |s|\n'
                         f'  ensures forall i :: 0 <= i < |r| ==> p(r[i])\n  decreases |s|\n'
                         f'{{ if |s| == 0 then [] else (if p(s[0]) then [s[0]] else []) + {name}(s[1..], p) }}\n'
                         f'// two predicates that agree on every element keep the same elements\n'
                         f'lemma {name}_same(s: seq<{A}>, p: {A} -> bool, q: {A} -> bool)\n'
                         f'  requires forall i :: 0 <= i < |s| ==> p(s[i]) == q(s[i])\n'
                         f'  ensures {name}(s, p) == {name}(s, q)\n  decreases |s|\n'
                         f'{{ if |s| > 0 {{ {name}_same(s[1..], p, q); }} }}')
        return name

    def tmp(self, base='t'):
        self.counter += 1
        return f'{base}{self.counter}_'

    # ----- statements: a list of statements is ONE Dafny expression; k(env) gives its value when the list ends -----
    def tr(self, stmts, env, ctx, k):
        if not stmts:
            return k(env)
        s, rest = stmts[0], stmts[1:]
        R = lambda e: self.tr(rest, e, ctx, k)
        if isinstance(s, ast.Pass):
            return R(env)
        if isinstance(s, ast.Expr):
            if isinstance(s.value, ast.Constant):
                return R(env)
            steps, v, t = self.ex(s.value, env, ctx)
            return self.emit(steps, R(env), ctx, env)
        if isinstance(s, ast.Return):
            if s.value is None:
                if self.rtype != NONE:
                    fail(s, 'missing-return', 'a bare `return` in a function that returns a value')
                return ctx.ret(env, 'Unit')
            steps, v, t = self.ex(s.value, env, ctx, expected=self.rtype)
            v = self.coerce(v, t, self.rtype, s)
            return self.emit(steps, ctx.ret(env, v), ctx, env)
        if isinstance(s, (ast.Assign, ast.AnnAssign, ast.AugAssign)):
            return self.assign(s, env, ctx, R)
        if isinstance(s, ast.If):
            return self.if_stmt(s, rest, env, ctx, k)
        if isinstance(s, ast.For):
            return self.loop(s, rest, env, ctx, k)
        if isinstance(s, ast.While):
            return self.loop(s, rest, env, ctx, k)
        if isinstance(s, ast.Break):
            if not ctx.brk:
                fail(s, 'break-continue', '`break` outside a loop')
            return ctx.brk(env)
        if isinstance(s, ast.Continue):
            if not ctx.cont:
                fail(s, 'break-continue', '`continue` outside a loop')
            return ctx.cont(env)
        if isinstance(s, ast.Raise):
            return self.raise_stmt(s, env, ctx)
        if isinstance(s, ast.Try):
            return self.try_stmt(s, rest, env, ctx, k)
        names = {ast.Delete: ('delete', '`del` changes a value in place: build the new value instead'),
                 ast.Global: ('closure-mutation', '`global` writes a variable outside the function'),
                 ast.Nonlocal: ('closure-mutation', '`nonlocal` writes a variable outside the function'),
                 ast.With: ('with', '`with` runs enter and exit hooks: outside milestone 1'),
                 ast.Assert: ('assert', '`assert` is removed under -O: raise explicitly'),
                 ast.FunctionDef: ('function-value', 'a nested function is a function value: outside milestone 1'),
                 ast.AsyncFunctionDef: ('async', 'a nested async function is outside milestone 1'),
                 ast.ClassDef: ('class', 'a nested class is outside milestone 1'),
                 ast.Import: ('import', 'an import inside a function runs module code: import at the top'),
                 ast.ImportFrom: ('import', 'an import inside a function runs module code: import at the top'),
                 ast.Match: ('match', '`match` is outside milestone 1: use if/elif'),
                 ast.AsyncFor: ('async', 'async for is outside milestone 1'),
                 ast.AsyncWith: ('async', 'async with is outside milestone 1')}
        for typ, (rule, msg) in names.items():
            if isinstance(s, typ):
                fail(s, rule, msg)
        fail(s, 'unsupported-syntax', f'{type(s).__name__} statement has no reading')

    def emit(self, steps, body, ctx, env):
        for st in reversed(steps):
            if st[0] == 'let':
                body = f'var {st[1]} := {st[2]};\n{body}'
            elif st[0] == 'check':
                body = f'if ext_faulted_World(wld) then\n{indent(wrap(ctx.fault(env)))}\nelse\n{indent(wrap(body))}'
        return body

    def check_step(self, ctx, env):
        return ('check',)  # the fault exit is the one of the context the steps are emitted in

    def assign(self, s, env, ctx, R):
        if isinstance(s, ast.AugAssign):
            if isinstance(s.target, ast.Name) and s.target.id in env.types and env.types[s.target.id][0] in ('list', 'dict'):
                fail(s, 'collection-mutation', f'`{s.target.id} {OPS.get(type(s.op).__name__, "?")}=` changes the {tstr(env.types[s.target.id])} in place (every alias sees it): write `{s.target.id} = {s.target.id} + ...`')
            target, ann = s.target, None
            value = ast.BinOp(left=ast.Name(id=target.id, ctx=ast.Load()) if isinstance(target, ast.Name) else target, op=s.op, right=s.value)
            ast.copy_location(value, s)
            ast.copy_location(value.left, s)
        elif isinstance(s, ast.AnnAssign):
            target, ann, value = s.target, s.annotation, s.value
            if value is None:
                if isinstance(target, ast.Name):
                    fail(s, 'uninitialised', f'{target.id} is declared without a value: assign it where it is declared')
                fail(s, 'property-assign', 'an annotated attribute without a value')
        else:
            if len(s.targets) != 1:
                fail(s, 'assign-target', 'chained assignment `a = b = v`: assign one name per statement')
            target, ann, value = s.targets[0], None, s.value
        if isinstance(target, ast.Attribute) and isinstance(target.value, ast.Name) and target.value.id == 'self' and self.cur.cls is not None and self.cur.cls.kind == 'plain':
            if not ctx.world:
                raise NeedsWorld()
            ft = self.check_type(self.class_fields(self.cur.cls).get(target.attr, ('unknown', 'self.' + target.attr)), target)
            if not immutable(ft, self.mod):
                fail(target, 'mutable-field', f'self.{target.attr} holds a {tstr(ft)}: a field lives in the world, and a mutable value there can change under the method; store an immutable value')
            steps, v, t = self.ex(value, env, ctx, expected=ft)
            v = self.coerce(v, t, ft, value)
            setter = self.external(f'ext_{self.cur.cls.name}_set_{target.attr}', ['World', 'Ext_' + self.cur.cls.name, self.dtype(ft)], 'World')
            self.dtype(('ext', self.cur.cls.name))
            steps = steps + [('let', 'wld', f'{setter}(wld, self, {v})')]
            return self.emit(steps, R(env), ctx, env)
        if isinstance(target, ast.Attribute):
            base = target.value
            if isinstance(base, ast.Name) and base.id == 'self':
                fail(s, 'receiver-mutation', 'a dataclass method assigns a field of self: return a new value (dataclasses.replace)')
            if isinstance(base, ast.Name) and self.is_param(base.id):
                fail(s, 'param-mutation', f'assigns a field of the parameter {base.id}: return a new value instead')
            fail(s, 'property-assign', 'assigns a field of a value: build a new value instead (dataclasses.replace)')
        if isinstance(target, ast.Subscript):
            base = target.value
            if isinstance(base, ast.Name) and self.is_param(base.id):
                fail(s, 'param-mutation', f'assigns an item of the parameter {base.id}: return a new value instead')
            fail(s, 'index-assign', 'assigns an item in place: build the new list or dict instead')
        if isinstance(target, ast.Tuple):
            if ann is not None:
                fail(s, 'assign-target', 'an annotated tuple target')
            steps, v, t = self.ex(value, env, ctx)
            if t[0] != 'tuple' or len(t[1]) != len(target.elts) or not all(isinstance(e, ast.Name) for e in target.elts):
                fail(s, 'destructuring', 'unpacking needs a tuple of the same length and plain names on the left')
            env2 = env.copy()
            names = []
            for e, et in zip(target.elts, t[1]):
                if e.id in env.types and env.types[e.id] != et:
                    fail(e, 'mixed-types', f'{e.id} changes type')
                env2.define(e.id, et)
                names.append(dn(e.id))
            return self.emit(steps, f'var ({", ".join(names)}) := {v};\n' + R(env2), ctx, env)
        if not isinstance(target, ast.Name):
            fail(s, 'assign-target', f'assignment to {type(target).__name__} has no reading')
        name = target.id
        declared = self.check_type(self.mod.hint(ann), ann) if ann is not None else None
        prev = env.types.get(name)
        if prev is not None and declared is not None and prev != declared:
            fail(s, 'mixed-types', f'{name} is declared again with another type')
        want = declared or prev
        steps, v, t = self.ex(value, env, ctx, expected=want)
        if want is None:
            if t == NONELIT:
                fail(value, 'uninitialised', f'{name} = None needs a type: write `{name}: Optional[T] = None`')
            if t[0] in ('list', 'dict') and t[1] is None:
                fail(value, 'untyped', f'{name} starts empty without an element type: write `{name}: list[T] = []`')
            want = t
        else:
            v = self.coerce(v, t, want, value)
        env2 = env.copy()
        fact = getattr(self, '_last_filter', None)
        env2.define(name, want)
        if fact is not None and fact[0] is value:
            env2.facts[name] = fact[1]
        self._last_filter = None
        return self.emit(steps, f'var {dn(name)}: {self.dtype(want)} := {v};\n' + R(env2), ctx, env)

    def is_param(self, name):
        return any(p.arg == name for p in self.cur.node.args.args) or (self.cur.node.args.vararg and self.cur.node.args.vararg.arg == name)

    # ----- if -----
    def transfers(self, stmts):
        """Does control leave this list other than by falling through (return, raise, break, continue)?"""
        for s in stmts:
            for n in ast.walk(s):
                if isinstance(n, (ast.Return, ast.Raise)):
                    return True
                if isinstance(n, (ast.Break, ast.Continue)) and not self.inside_loop(n, s):
                    return True
        return False

    def inside_loop(self, node, top):
        """Is `node` inside a loop nested in `top` (so its break/continue stay inside)?"""
        for n in ast.walk(top):
            if isinstance(n, (ast.For, ast.While)) and n is not top or (n is top and isinstance(n, (ast.For, ast.While))):
                for m in ast.walk(n):
                    if m is node:
                        return True
        return False

    def definitely_assigned(self, stmts):
        out = set()
        for s in stmts:
            if isinstance(s, ast.Assign):
                for t in s.targets:
                    for n in ([t] if isinstance(t, ast.Name) else (t.elts if isinstance(t, ast.Tuple) else [])):
                        if isinstance(n, ast.Name):
                            out.add(n.id)
            elif isinstance(s, (ast.AnnAssign, ast.AugAssign)) and isinstance(s.target, ast.Name):
                out.add(s.target.id)
            elif isinstance(s, ast.If):
                out |= self.definitely_assigned(s.body) & self.definitely_assigned(s.orelse)
        return out

    def assigned(self, stmts):
        """Every name a list of statements may assign, nested blocks included."""
        out = set()
        for s in stmts:
            for n in ast.walk(s):
                if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store):
                    out.add(n.id)
                elif isinstance(n, ast.ExceptHandler) and n.name:
                    out.add(n.name)
        return out

    def narrowing(self, test, env, positive):
        """The names a condition narrows from Optional[T] to T when it holds (positive) or fails."""
        out = set()
        if isinstance(test, ast.Compare) and len(test.ops) == 1 and isinstance(test.left, ast.Name) and \
                isinstance(test.comparators[0], ast.Constant) and test.comparators[0].value is None:
            op = test.ops[0]
            if (isinstance(op, ast.IsNot) and positive) or (isinstance(op, ast.Is) and not positive):
                if env.types.get(test.left.id, ('?',))[0] == 'opt':
                    out.add(test.left.id)
        elif isinstance(test, ast.BoolOp) and isinstance(test.op, ast.And) and positive:
            for v in test.values:
                out |= self.narrowing(v, env, True)
        elif isinstance(test, ast.BoolOp) and isinstance(test.op, ast.Or) and not positive:
            for v in test.values:
                out |= self.narrowing(v, env, False)
        elif isinstance(test, ast.UnaryOp) and isinstance(test.op, ast.Not):
            out |= self.narrowing(test.operand, env, not positive)
        return out

    def if_stmt(self, s, rest, env, ctx, k):
        steps, c, t = self.ex(s.test, env, ctx)
        if t != BOOL:
            fail(s.test, 'truthiness', f'the condition is a {tstr(t)}: compare explicitly (`len(xs) > 0`, `x is not None`)')
        et, ee = env.copy(), env.copy()
        et.narrowed |= self.narrowing(s.test, env, True)
        ee.narrowed |= self.narrowing(s.test, env, False)
        if self.transfers(s.body) or self.transfers(s.orelse):
            th = self.tr(s.body + rest, et, ctx, k)
            el = self.tr(s.orelse + rest, ee, ctx, k)
            return self.emit(steps, f'if {c} then\n{indent(wrap(th))}\nelse\n{indent(wrap(el))}', ctx, env)
        da_t, da_e = self.definitely_assigned(s.body), self.definitely_assigned(s.orelse)
        assigned = self.assigned(s.body) | self.assigned(s.orelse)
        join = sorted(n for n in assigned if (n in env.types) or (n in da_t and n in da_e))
        J = (['wld'] if ctx.world else []) + [dn(n) for n in join]
        after = env.copy()
        for n in assigned - set(join):
            after.types.pop(n, None)
        for n in assigned:
            after.narrowed.discard(n)
        if not J:
            return self.emit(steps, self.tr(rest, after, ctx, k), ctx, env)  # a pure branch that assigns nothing
        types = {}

        def kj(e):
            for n in join:
                if n in e.types:
                    if n in types and types[n] != e.types[n]:
                        fail(s, 'mixed-types', f'{n} gets two types on the two branches')
                    types[n] = e.types[n]
            return tup([('wld' if x == 'wld' else self.read_name(x, e)) for x in J])
        sub = Ctx(ctx.world, ret=None, fault=lambda e: tup([('wld' if x == 'wld' else self.read_name(x, e)) for x in J]), brk=None, cont=None)
        th = self.tr(s.body, et, sub, kj)
        el = self.tr(s.orelse, ee, sub, kj)
        for n in join:
            after.types[n] = types.get(n, env.types.get(n))
        text = f'var {tup(J)} := if {c} then\n{indent(wrap(th))}\nelse\n{indent(wrap(el))};\n'
        if ctx.world:
            text += f'if ext_faulted_World(wld) then\n{indent(wrap(ctx.fault(after)))}\nelse\n{indent(wrap(self.tr(rest, after, ctx, k)))}'
        else:
            text += self.tr(rest, after, ctx, k)
        return self.emit(steps, text, ctx, env)

    def read_name(self, dname, env):
        """The Dafny text of a join variable at the end of a branch (by its Dafny name)."""
        return dname

    # ----- raise and try -----
    def raise_stmt(self, s, env, ctx):
        if not ctx.world:
            raise NeedsWorld()
        if s.cause is not None:
            fail(s, 'exception-value', '`raise ... from ...` is outside milestone 1')
        if s.exc is None:
            cur = getattr(self, '_handling', None)
            if cur is None:
                fail(s, 'exception-value', 'a bare `raise` outside an except block')
            return f'var wld := ext_raise_World_Any(wld, {cur});\n' + ctx.fault(env)
        e = s.exc
        steps = []
        if isinstance(e, ast.Name) and e.id in env.types and env.types[e.id] == ('exc',):
            val = dn(e.id)
        else:
            cls, arg = (e.func, e.args) if isinstance(e, ast.Call) else (e, [])
            if isinstance(e, ast.Call) and e.keywords:
                fail(e, 'exception-value', 'an exception with keyword arguments')
            if not (isinstance(cls, ast.Name) and cls.id in BUILTIN_EXC):
                fail(e, 'exception-value', 'raise a built-in exception class (ValueError, KeyError, ...): custom classes are milestone 2')
            if len(arg) > 1:
                fail(e, 'exception-value', 'an exception with more than one argument')
            if arg:
                steps, v, t = self.ex(arg[0], env, ctx)
                if t != STR:
                    fail(arg[0], 'exception-value', 'the exception argument must be a str')
                val = self.exc_value(cls.id, v)
            else:
                val = self.exc_value(cls.id, None)
        return self.emit(steps, f'var wld := ext_raise_World_Any(wld, {val});\n' + ctx.fault(env), ctx, env)

    def try_stmt(self, s, rest, env, ctx, k):
        if not ctx.world:
            raise NeedsWorld()
        if s.finalbody:
            fail(s, 'finally', '`finally` is outside milestone 1')
        if s.orelse:
            fail(s, 'try-else', '`try ... else` is outside milestone 1: move the else block after the try')
        handlers = s.handlers

        def dispatch(e):
            v = self.tmp('e')
            out = []
            branches = []
            for h in handlers:
                if h.type is None:
                    cond = 'true'
                else:
                    names = h.type.elts if isinstance(h.type, ast.Tuple) else [h.type]
                    conds = []
                    for nm in names:
                        if not (isinstance(nm, ast.Name) and nm.id in BUILTIN_EXC):
                            fail(nm, 'exception-value', 'catch a built-in exception class: custom classes are milestone 2')
                        conds.append(self.external(f'ext_exc_is_{nm.id}', ['Any'], 'bool') + f'({v})')
                    cond = ' || '.join(conds)
                he = e.copy()
                if h.name:
                    he.define(h.name, ('exc',))
                saved = getattr(self, '_handling', None)
                self._handling = v
                try:
                    body = (f'var {dn(h.name)}: Any := {v};\n' if h.name else '') + self.tr(h.body + rest, he, ctx, k)
                finally:
                    self._handling = saved
                branches.append((cond, body))
            reraise = f'var wld := ext_raise_World_Any(wld, {v});\n' + ctx.fault(e)
            text = reraise
            for cond, body in reversed(branches):
                text = f'if {cond} then\n{indent(wrap(body))}\nelse\n{indent(wrap(text))}' if cond != 'true' else body
            return f'var {v}: Any := ext_fault_value_World(wld);\nvar wld := ext_clear_fault_World(wld);\n' + text
        inner = Ctx(ctx.world, ret=ctx.ret, fault=dispatch, brk=ctx.brk, cont=ctx.cont, rtype=ctx.rtype)
        return self.tr(s.body, env, inner, lambda e: self.tr(rest, e, ctx, k))

    # ----- loops: a private recursive helper with a measure -----
    def loop(self, s, rest, env, ctx, k):
        self.loop_counter += 1
        lid = self.loop_counter
        unit = dafny_name(self.cur.name)
        hn = f'{unit}_loop{lid - 1}{self.sfx}'
        pre_steps = []
        lead, lead_first, lead_next, requires = [], [], [], []
        body_env = env.copy()
        if s.orelse:
            fail(s, 'loop-form', 'a loop with an `else` block is outside milestone 1')
        bind = ''
        facts = set()
        if isinstance(s, ast.For):
            if not isinstance(s.target, ast.Name):
                fail(s.target, 'destructuring', 'the loop target is one name at milestone 1')
            x = s.target.id
            if x in env.types:
                fail(s.target, 'loop-var-assign', f'the loop variable {x} reuses a name defined before the loop: use a new name')
            it = s.iter
            if isinstance(it, ast.Call) and isinstance(it.func, ast.Name) and it.func.id == 'range' and 'range' not in self.units:
                if it.keywords or not 1 <= len(it.args) <= 2:
                    fail(it, 'loop-form', 'range with a step is outside milestone 1: range(stop) or range(start, stop)')
                a_steps, a, at = self.ex(it.args[0], env, ctx) if len(it.args) == 2 else ([], '0', INT)
                b_steps, b, bt = self.ex(it.args[-1], env, ctx)
                if at != INT or bt != INT:
                    fail(it, 'mixed-types', 'range takes ints')
                stop = self.tmp('stop')
                pre_steps = a_steps + b_steps + [('let', f'{stop}: int', b)]
                iv = dn(x)
                lead = [f'{iv}: int', f'{stop}: int']
                lead_first = [a, stop]
                lead_next = [f'{iv} + 1', stop]
                exit_ = f'{iv} >= {stop}'
                decreases = f'{stop} - {iv}'
                body_env.define(x, INT)
                if isinstance(it.args[0], ast.Constant) and len(it.args) == 2 and isinstance(it.args[0].value, int) and it.args[0].value >= 0 or len(it.args) == 1:
                    facts.add(x)
                    requires.append(f'{iv} >= {a}')
            else:
                it_steps, src, itt = self.ex(it, env, ctx)
                if itt[0] == 'dict':
                    fail(it, 'dict-order', 'iterating a dict observes its insertion order, which a map does not keep: iterate a list of keys')
                if itt == STR:
                    fail(it, 'string-iteration', 'iterating a str is outside milestone 1: index it in a range loop')
                if itt[0] != 'list' or itt[1] is None:
                    fail(it, 'loop-form', f'a for loop over a {tstr(itt)}: iterate a list or a range')
                T = itt[1]
                sq, ix = f'seq{lid - 1}', f'idx{lid - 1}'
                pre_steps = it_steps
                lead = [f'{sq}: seq<{self.dtype(T)}>', f'{ix}: int']
                lead_first = [src, '0']
                lead_next = [sq, f'{ix} + 1']
                requires.append(f'0 <= {ix} <= |{sq}|')
                exit_ = f'{ix} >= |{sq}|'
                decreases = f'|{sq}| - {ix}'
                bind = f'var {dn(x)}: {self.dtype(T)} := {sq}[{ix}];\n'
                body_env.define(x, T)
                if isinstance(it, ast.Name) and it.id in env.facts:
                    var, lam = env.facts[it.id]
                    requires.append(f'forall k :: 0 <= k < |{sq}| ==> {lam}({sq}[k])')
                    facts.add(x)
        else:
            hint = decreases_hint(self.mod.text, s.lineno)
            if hint is None:
                fail(s, 'unbounded-while', 'a while loop needs `# @decreases <expr>` on its line or the line above')
            c_steps, c, ct = self.ex(s.test, env, ctx)
            if c_steps:
                fail(s.test, 'loop-form', 'a while condition that calls the outside: compute it inside the loop')
            if ct != BOOL:
                fail(s.test, 'truthiness', 'the condition is not a bool: compare explicitly')
            try:
                hnode = ast.parse(hint, mode='eval').body
            except SyntaxError:
                fail(s, 'unbounded-while', f'`# @decreases {hint}` is not an expression')
            exit_ = f'!({c})'
            decreases = None
            self._hint_node = hnode
        # what the loop carries: names it assigns that exist before it; what it reads: names defined before it
        if isinstance(s, ast.For) and s.target.id in self.assigned(s.body):
            fail(s, 'loop-var-assign', f'the body assigns the loop variable {s.target.id}: use another name')
        assigned = self.assigned(s.body) - ({s.target.id} if isinstance(s, ast.For) else set())
        M = sorted(n for n in assigned if n in env.types)
        scanned = list(s.body) + ([s.test] if isinstance(s, ast.While) else [])
        reads = sorted({n.id for st in scanned for n in ast.walk(st) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load)} & set(env.types))
        free = [n for n in reads if n not in M]
        if isinstance(s, ast.While):
            hn_reads = {n.id for n in ast.walk(self._hint_node) if isinstance(n, ast.Name)}
            free += [n for n in sorted(hn_reads & set(env.types)) if n not in M and n not in free]
        has_ret = any(isinstance(n, ast.Return) for st in s.body for n in ast.walk(st))
        fuel = self.cur.name in self.recursive
        world = ctx.world
        stateN = (['wld'] if world else []) + ([f'ret{lid - 1}'] if has_ret else []) + [dn(n) for n in M]
        stateT = (['World'] if world else []) + ([f'Option<{self.dtype(self.rtype)}>'] if has_ret else []) + [self.dtype(env.types[n]) for n in M]
        if has_ret:
            self.need_option()
        const_p = (['fuel: nat'] if fuel else []) + [f'{dn(n)}: {self.dtype(env.types[n])}' for n in free]
        const_a = (['fuel'] if fuel else []) + [dn(n) for n in free]
        if fuel:
            requires.append('fuel > 0')
        for n in free:
            if n in env.narrowed:
                requires.append(f'{dn(n)}.Some?')
        lead_names = [p.split(':')[0] for p in lead]
        params = lead + const_p + [f'{a}: {b}' for a, b in zip(stateN, stateT)]
        resT = tup(stateT) if stateT else 'Unit'
        if not stateT:
            return self.emit(pre_steps, self.tr(rest, env, ctx, k), ctx, env)  # a loop that changes nothing and cannot fault: no observation
        args_now = lambda: lead_names + const_a + stateN
        call_next = lambda e: f'{hn}({", ".join(lead_next + const_a + [self.state_text(x, e) for x in stateN])})'
        exit_val = lambda e, ret='None': tup([(ret if x == f'ret{lid - 1}' else self.state_text(x, e)) for x in stateN])
        inner_env = body_env
        inner_env.narrowed = {n for n in env.narrowed if n in free}
        lctx = Ctx(world, ret=lambda e, v: exit_val(e, f'Some({v})'), fault=lambda e: exit_val(e), brk=lambda e: exit_val(e),
                   cont=call_next, rtype=ctx.rtype)
        self.loop_depth += 1
        try:
            body = self.tr(s.body, inner_env, lctx, call_next)
        finally:
            self.loop_depth -= 1
        if isinstance(s, ast.While):
            _, hd, ht = self.ex(self._hint_node, body_env, Ctx(False, None, None))
            decreases = hd
        tp = [v for v in self.unit_tparams if re.search(r'\b' + v + r'\b', ', '.join(params) + resT)]
        tcl = f'<{", ".join(tp)}>' if tp else ''
        call_self = f'{hn}({", ".join(args_now())})'
        hints = []
        for n in M:
            if env.types[n] == INT and self.keeps_nonneg(n, s.body, facts):
                hints.append(f'{dn(n)} >= 0')
        meas = f'fuel, {10 - self.loop_depth}, {decreases}' if fuel else decreases
        specs = [f'  requires {r}' for r in requires] + [f'  ensures ({h}) ==> (var {tup(stateN)} := {call_self}; {h})' for h in hints] + [f'  decreases {meas}']
        helper = '\n'.join([f'function {hn}{tcl}({", ".join(params)}): {resT}'] + specs + ['{', indent(f'if {exit_} then {exit_val(None)}\nelse\n{indent(wrap(bind + body))}'), '}'])
        self.helpers.append(helper)
        first = f'{hn}({", ".join(lead_first + const_a + [("None" if x == f"ret{lid - 1}" else x) for x in stateN])})'
        after = env.copy()
        for n in assigned - set(M):
            after.types.pop(n, None)
        for n in M:
            after.narrowed.discard(n)
            after.facts.pop(n, None)
        text = self.tr(rest, after, ctx, k)
        if has_ret:
            r = f'ret{lid - 1}'
            text = f'if {r}.Some? then\n{indent(wrap(ctx.ret(after, r + ".value")))}\nelse\n{indent(wrap(text))}'
        if world:
            text = f'if ext_faulted_World(wld) then\n{indent(wrap(ctx.fault(after)))}\nelse\n{indent(wrap(text))}'
        return self.emit(pre_steps, f'var {tup(stateN)} := {first};\n{text}', ctx, env)

    def state_text(self, x, env):
        return x

    def keeps_nonneg(self, v, body, facts):
        """A loop-carried int that starts non-negative stays so: every write adds a non-negative amount."""
        ok, seen = [True], [False]

        def nonneg(e, f):
            if isinstance(e, ast.Constant) and isinstance(e.value, int) and not isinstance(e.value, bool):
                return e.value >= 0
            if isinstance(e, ast.Name):
                return e.id in f
            if isinstance(e, ast.Call) and isinstance(e.func, ast.Name) and e.func.id == 'len':
                return True
            if isinstance(e, ast.BinOp) and isinstance(e.op, (ast.Add, ast.Mult)):
                return nonneg(e.left, f) and nonneg(e.right, f)
            return False

        def guard(c):
            out = set()
            if isinstance(c, ast.Compare) and len(c.ops) == 1 and isinstance(c.left, ast.Name) and isinstance(c.ops[0], (ast.Gt, ast.GtE)):
                r = c.comparators[0]
                if isinstance(r, ast.Constant) and isinstance(r.value, int) and r.value >= 0:
                    out.add(c.left.id)
            if isinstance(c, ast.BoolOp) and isinstance(c.op, ast.And):
                for x in c.values:
                    out |= guard(x)
            return out

        def visit(stmts, f):
            for x in stmts:
                if not ok[0]:
                    return
                if isinstance(x, ast.If):
                    visit(x.body, f | guard(x.test))
                    visit(x.orelse, f)
                elif isinstance(x, (ast.For, ast.While)):
                    visit(x.body, f)
                elif isinstance(x, ast.Try):
                    visit(x.body, f)
                    for h in x.handlers:
                        visit(h.body, f)
                elif isinstance(x, ast.AugAssign) and isinstance(x.target, ast.Name) and x.target.id == v:
                    seen[0] = True
                    ok[0] = isinstance(x.op, ast.Add) and nonneg(x.value, f)
                elif isinstance(x, (ast.Assign, ast.AnnAssign)):
                    tg = x.targets[0] if isinstance(x, ast.Assign) else x.target
                    if isinstance(tg, ast.Name) and tg.id == v:
                        seen[0] = True
                        r = x.value
                        if isinstance(r, ast.BinOp) and isinstance(r.op, ast.Add):
                            isv = lambda z: isinstance(z, ast.Name) and z.id == v
                            ok[0] = (isv(r.left) and nonneg(r.right, f)) or (isv(r.right) and nonneg(r.left, f)) or nonneg(r, f)
                        else:
                            ok[0] = nonneg(r, f)
        visit(body, set(facts))
        return ok[0] and seen[0]

    # ----- expressions: (steps, text, type); a step is ('let', lhs, rhs) or ('check', fault text) -----
    def ex(self, n, env, ctx, expected=None):
        m = getattr(self, 'ex_' + type(n).__name__, None)
        if m is None:
            rules = {'Lambda': ('function-value', 'a lambda is a function value: outside milestone 1 (a comprehension reads)'),
                     'NamedExpr': ('assignment-expression', 'the walrus operator assigns inside an expression: assign first'),
                     'Await': ('async', 'await is outside milestone 1'), 'Yield': ('generator', 'generators are outside milestone 1'),
                     'YieldFrom': ('generator', 'generators are outside milestone 1'),
                     'GeneratorExp': ('generator', 'a generator expression is lazy: write a list comprehension'),
                     'SetComp': ('unsupported-syntax', 'sets are outside milestone 1'), 'Set': ('unsupported-syntax', 'sets are outside milestone 1'),
                     'DictComp': ('dict-order', 'a dict comprehension iterates in order: outside milestone 1'),
                     'Starred': ('spread', 'a starred value outside a call to a function with *args')}
            r = rules.get(type(n).__name__, ('unsupported-syntax', f'{type(n).__name__} has no reading'))
            fail(n, r[0], r[1])
        return m(n, env, ctx, expected)

    def pure(self, n, env, ctx, expected=None):
        steps, v, t = self.ex(n, env, ctx, expected)
        if steps:
            fail(n, 'comprehension-effect', 'this position must be pure (no call into the outside, nothing that may raise)')
        return v, t

    def ex_Constant(self, n, env, ctx, expected):
        v = n.value
        if v is None:
            return [], 'None', NONELIT
        if isinstance(v, bool):
            return [], 'true' if v else 'false', BOOL
        if isinstance(v, int):
            return [], (f'({v})' if v < 0 else str(v)), INT
        if isinstance(v, str):
            return [], self.str_lit(v, n), STR
        if isinstance(v, float):
            fail(n, 'float', 'a float literal has no exact reading at milestone 1: use int')
        fail(n, 'unsupported-syntax', f'literal {v!r} has no reading')

    def str_lit(self, v, n):
        out = []
        for ch in v:
            o = ord(ch)
            if 0xD800 <= o <= 0xDFFF:
                fail(n, 'string-code-unit', 'a lone surrogate has no Dafny char')
            if ch == '"':
                out.append('\\"')
            elif ch == '\\':
                out.append('\\\\')
            elif ch == '\n':
                out.append('\\n')
            elif ch == '\t':
                out.append('\\t')
            elif ch == '\r':
                out.append('\\r')
            elif 32 <= o < 127:
                out.append(ch)
            else:
                out.append('\\U{%x}' % o)
        return '"' + ''.join(out) + '"'

    def ex_Name(self, n, env, ctx, expected):
        name = n.id
        if name in env.types:
            t = env.types[name]
            if t == ('exc',):
                return [], dn(name), t
            if t[0] == 'opt' and name in env.narrowed:
                return [], f'{dn(name)}.value', t[1]
            return [], dn(name), t
        if name in ('True', 'False'):
            return [], name.lower(), BOOL
        if name in self.local_names:
            fail(n, 'uninitialised', f'{name} is not assigned on every path to this read: assign it first')
        if name in self.mod.consts:
            return self.ex_Constant(self.mod.consts[name], env, ctx, expected)
        if name in self.units or name in self.mod.functions:
            fail(n, 'function-value', f'{name} used as a value: call it')
        if name in self.mod.imports:
            fail(n, 'global-read', f'{name} is imported: a module value read as data is outside milestone 1')
        fail(n, 'uninitialised', f'{name} is not defined on every path to this read (or is a module variable): define it first')

    def ex_JoinedStr(self, n, env, ctx, expected):
        steps, parts = [], []
        for p in n.values:
            if isinstance(p, ast.Constant):
                parts.append(self.str_lit(p.value, p))
            else:
                if p.conversion != -1 or p.format_spec is not None:
                    fail(p, 'string-format', 'a format spec or conversion in an f-string is outside milestone 1')
                s2, v, t = self.ex(p.value, env, ctx)
                steps += s2
                parts.append(self.to_str(v, t, p))
        return steps, '(' + ' + '.join(parts or ['""']) + ')', STR

    def to_str(self, v, t, node):
        if t == STR:
            return v
        if t == INT:
            return self.external('ext_str_of_int', ['int'], 'string') + f'({v})'
        if t == BOOL:
            return f'(if {v} then "True" else "False")'
        if t == ('exc',):
            return self.external('ext_str_of_Any', ['Any'], 'string') + f'({v})'
        fail(node, 'string-format', f'str() of a {tstr(t)} is outside milestone 1')

    def ex_BinOp(self, n, env, ctx, expected):
        s1, a, ta = self.ex(n.left, env, ctx)
        s2, b, tb = self.ex(n.right, env, ctx)
        steps = s1 + s2
        op = n.op
        if isinstance(op, ast.Add):
            if ta == tb == INT:
                return steps, f'({a} + {b})', INT
            if ta == tb == STR:
                return steps, f'({a} + {b})', STR
            if ta[0] == 'list' and tb[0] == 'list':
                return steps, f'({a} + {b})', self.unify(ta, tb, n)
            fail(n, 'mixed-types', f'+ on {tstr(ta)} and {tstr(tb)}')
        if isinstance(op, (ast.Sub, ast.Mult)):
            if ta == tb == INT:
                return steps, f'({a} {"-" if isinstance(op, ast.Sub) else "*"} {b})', INT
            if isinstance(op, ast.Mult) and {ta[0], tb[0]} & {'str', 'list'}:
                fail(n, 'unsupported-operator', 'repetition (`s * n`) is outside milestone 1')
            fail(n, 'mixed-types', f'arithmetic on {tstr(ta)} and {tstr(tb)}')
        if isinstance(op, (ast.FloorDiv, ast.Mod)):
            if not (ta == tb == INT):
                fail(n, 'mixed-types', f'// and % on {tstr(ta)} and {tstr(tb)}: ints only')
            h = self.helper('PyFloorDiv' if isinstance(op, ast.FloorDiv) else 'PyMod')
            if isinstance(n.right, ast.Constant) and isinstance(n.right.value, int) and n.right.value != 0:
                return steps, f'{h}({a}, {b})', INT
            if not ctx.world:
                raise NeedsWorld()
            t = self.tmp()
            d = self.tmp('d')
            steps = steps + [('let', d, b),
                             ('let', f'(wld, {t})', f'if {d} != 0 then (wld, {h}({a}, {d})) else ({self.raise_text("ZeroDivisionError")}, {self.fault_result(INT)})'),
                             self.check_step(ctx, env)]
            return steps, t, INT
        if isinstance(op, ast.Pow):
            if ta == INT and isinstance(n.right, ast.Constant) and isinstance(n.right.value, int) and n.right.value >= 0:
                return steps, f'{self.helper("PyPow")}({a}, {b})', INT
            fail(n, 'power', '** with an exponent other than a non-negative int literal is outside milestone 1')
        if isinstance(op, ast.Div):
            fail(n, 'division', '/ is true division (a float): use // on ints')
        if isinstance(op, (ast.BitAnd, ast.BitOr, ast.BitXor, ast.LShift, ast.RShift)):
            fail(n, 'bitwise', 'bitwise operators are outside milestone 1')
        fail(n, 'unsupported-operator', f'{type(op).__name__} has no reading')

    def ex_UnaryOp(self, n, env, ctx, expected):
        s, v, t = self.ex(n.operand, env, ctx)
        if isinstance(n.op, ast.USub) and t == INT:
            return s, f'(-{v})', INT
        if isinstance(n.op, ast.UAdd) and t == INT:
            return s, v, INT
        if isinstance(n.op, ast.Not):
            if t != BOOL:
                fail(n, 'truthiness', f'`not` on a {tstr(t)}: compare explicitly')
            return s, f'!{v}', BOOL
        if isinstance(n.op, ast.Invert):
            fail(n, 'bitwise', '~ is outside milestone 1')
        fail(n, 'mixed-types', f'{type(n.op).__name__} on a {tstr(t)}')

    def ex_BoolOp(self, n, env, ctx, expected):
        isand = isinstance(n.op, ast.And)
        s0, acc, t0 = self.ex(n.values[0], env, ctx)
        if t0 != BOOL:
            fail(n.values[0], 'truthiness', f'`{"and" if isand else "or"}` on a {tstr(t0)}: its value is an operand, not a bool; compare explicitly')
        steps = list(s0)
        e = env.copy()
        for v in n.values[1:]:
            if isand:
                e.narrowed |= self.narrowing(n.values[n.values.index(v) - 1], e, True)
            s1, b, t1 = self.ex(v, e, ctx)
            if t1 != BOOL:
                fail(v, 'truthiness', f'`{"and" if isand else "or"}` on a {tstr(t1)}: compare explicitly')
            if s1:
                t = self.tmp()
                sub = Ctx(ctx.world, None, fault=lambda e2: '(wld, false)')
                inner = self.emit(s1, f'(wld, {b})', sub, e)
                steps.append(('let', f'(wld, {t})', f'if {acc} then {wrap(inner) if isand else "(wld, true)"} else {"(wld, false)" if isand else wrap(inner)}'))
                steps.append(self.check_step(ctx, env))
                acc = t
            else:
                acc = f'({acc} {"&&" if isand else "||"} {b})'
        return steps, acc, BOOL

    def ex_IfExp(self, n, env, ctx, expected):
        s0, c, tc = self.ex(n.test, env, ctx)
        if tc != BOOL:
            fail(n.test, 'truthiness', f'the condition is a {tstr(tc)}: compare explicitly')
        et, ee = env.copy(), env.copy()
        et.narrowed |= self.narrowing(n.test, env, True)
        ee.narrowed |= self.narrowing(n.test, env, False)
        s1, a, ta = self.ex(n.body, et, ctx, expected)
        s2, b, tb = self.ex(n.orelse, ee, ctx, expected)
        t = self.unify(ta, tb, n) if expected is None else expected
        if expected is not None:
            a, b = self.coerce(a, ta, t, n.body), self.coerce(b, tb, t, n.orelse)
        else:
            a, b = self.coerce(a, ta, t, n.body), self.coerce(b, tb, t, n.orelse)
        if not s1 and not s2:
            return s0, f'(if {c} then {a} else {b})', t
        r = self.tmp()
        fr = self.fault_result(t)
        sub = Ctx(ctx.world, None, fault=lambda e2: f'(wld, {fr})')
        A = self.emit(s1, f'(wld, {a})', sub, et)
        B = self.emit(s2, f'(wld, {b})', sub, ee)
        return s0 + [('let', f'(wld, {r})', f'if {c} then {wrap(A)} else {wrap(B)}'), self.check_step(ctx, env)], r, t

    def ex_Compare(self, n, env, ctx, expected):
        steps, parts = [], []
        left_node = n.left
        s0, left, lt = self.ex(n.left, env, ctx)
        steps += s0
        for op, rn in zip(n.ops, n.comparators):
            s1, right, rt = self.ex(rn, env, ctx)
            steps += s1
            if len(n.ops) > 1 and (s0 or s1):
                fail(n, 'comparison-chain', 'a chained comparison with a call into the outside: split it')
            parts.append(self.compare(op, left, lt, right, rt, n, left_node, rn))
            left, lt, left_node = right, rt, rn
        return steps, ' && '.join(parts) if len(parts) == 1 else '(' + ' && '.join(parts) + ')', BOOL

    def compare(self, op, a, ta, b, tb, n, an, bn):
        if isinstance(op, (ast.Is, ast.IsNot)):
            if tb == NONELIT and ta[0] == 'opt':
                return f'{a.removesuffix(".value")}.{"None?" if isinstance(op, ast.Is) else "Some?"}'
            if ta == NONELIT and tb[0] == 'opt':
                return f'{b.removesuffix(".value")}.{"None?" if isinstance(op, ast.Is) else "Some?"}'
            fail(n, 'identity', '`is` compares object identity: use == on values (or `is None` on an Optional)')
        if isinstance(op, (ast.Eq, ast.NotEq)):
            neg = isinstance(op, ast.NotEq)
            if ta == NONELIT or tb == NONELIT:
                fail(n, 'identity', 'compare with None by `is None` / `is not None`')
            t = self.unify(ta, tb, n)
            a2, b2 = self.coerce(a, ta, t, an), self.coerce(b, tb, t, bn)
            if t[0] == 'tvar':
                e = f'{self.generic_eq()}({a2}, {b2})'
                return f'!{e}' if neg else e
            if not self.exact_eq(t):
                fail(n, 'value-equality', f'== on a {tstr(t)} calls its __eq__: compare fields of plain values')
            return f'({a2} {"!=" if neg else "=="} {b2})'
        if isinstance(op, (ast.Lt, ast.LtE, ast.Gt, ast.GtE)):
            if ta == tb == INT:
                sym = {ast.Lt: '<', ast.LtE: '<=', ast.Gt: '>', ast.GtE: '>='}[type(op)]
                return f'({a} {sym} {b})'
            if ta == tb == STR:
                fail(n, 'string-order', '< on str compares code points: outside milestone 1')
            fail(n, 'mixed-types', f'ordering on {tstr(ta)} and {tstr(tb)}')
        if isinstance(op, (ast.In, ast.NotIn)):
            neg = isinstance(op, ast.NotIn)
            if tb[0] == 'list' and tb[1] is not None:
                et = tb[1]
                if not self.exact_eq(et) or self.unify(ta, et, n) != et:
                    fail(n, 'value-equality', f'`in` on a list of {tstr(et)} compares by __eq__')
                e = f'({self.coerce(a, ta, et, an)} in {b})'
            elif tb[0] == 'dict':
                e = f'({self.coerce(a, ta, tb[1], an)} in {b})'
            elif tb == STR and ta == STR:
                e = f'{self.helper("PyContains")}({b}, {a})'
            else:
                fail(n, 'mixed-types', f'`in` on a {tstr(tb)}')
            return f'!{e}' if neg else e
        fail(n, 'unsupported-operator', f'{type(op).__name__}')

    def generic_eq(self):
        self.block('ext_eq', 'function ext_eq<T>(a0: T, a1: T): bool')
        return 'ext_eq'

    def ex_List(self, n, env, ctx, expected):
        steps, vals, et = [], [], (expected[1] if expected and expected[0] == 'list' else None)
        for e in n.elts:
            if isinstance(e, ast.Starred):
                fail(e, 'spread', 'a starred element in a list: concatenate with +')
            s, v, t = self.ex(e, env, ctx, et)
            steps += s
            if et is None:
                et = t
            else:
                v = self.coerce(v, t, self.unify(et, t, e) if et != t else et, e)
            vals.append((v, t))
        if et is not None:
            vals = [self.coerce(v, t, et, n) for v, t in vals]
        else:
            vals = []
        return steps, '[' + ', '.join(vals) + ']', ('list', et)

    def ex_Tuple(self, n, env, ctx, expected):
        steps, vals, ts = [], [], []
        for i, e in enumerate(n.elts):
            ex_t = expected[1][i] if expected and expected[0] == 'tuple' and i < len(expected[1]) else None
            s, v, t = self.ex(e, env, ctx, ex_t)
            steps += s
            if ex_t is not None:
                v, t = self.coerce(v, t, ex_t, e), ex_t
            vals.append(v)
            ts.append(t)
        if len(vals) < 2:
            fail(n, 'unsupported-syntax', 'a tuple of fewer than two items')
        return steps, '(' + ', '.join(vals) + ')', ('tuple', ts)

    def ex_Dict(self, n, env, ctx, expected):
        kt, vt = (expected[1], expected[2]) if expected and expected[0] == 'dict' else (None, None)
        steps, text = [], None
        pending = []
        for k, v in zip(n.keys, n.values):
            if k is None:  # {**other}
                s, d, dt = self.ex(v, env, ctx, expected)
                steps += s
                if dt[0] != 'dict':
                    fail(v, 'spread', '** of a value that is not a dict')
                if kt is None:
                    kt, vt = dt[1], dt[2]
                text = d if text is None else f'({text} + {d})'
                continue
            s1, kv, kt2 = self.ex(k, env, ctx, kt)
            s2, vv, vt2 = self.ex(v, env, ctx, vt)
            steps += s1 + s2
            if kt is None:
                kt, vt = kt2, vt2
            kv, vv = self.coerce(kv, kt2, kt, k), self.coerce(vv, vt2, vt, v)
            text = f'(map[{kv} := {vv}])' if text is None else f'{text}[{kv} := {vv}]'
        if text is None:
            text = 'map[]'
        return steps, text, ('dict', kt, vt)

    def ex_ListComp(self, n, env, ctx, expected):
        if len(n.generators) != 1:
            fail(n, 'comprehension', 'one `for` per comprehension at milestone 1')
        g = n.generators[0]
        if g.is_async or not isinstance(g.target, ast.Name) or len(g.ifs) > 1:
            fail(n, 'comprehension', 'a comprehension over one name with at most one `if`')
        s, src, st = self.ex(g.iter, env, ctx)
        if st[0] == 'dict':
            fail(g.iter, 'dict-order', 'iterating a dict observes its insertion order: iterate a list of keys')
        if st[0] != 'list' or st[1] is None:
            fail(g.iter, 'comprehension', f'a comprehension over a {tstr(st)}: iterate a list')
        x = g.target.id
        T = st[1]
        inner = env.copy()
        inner.define(x, T)
        lam = lambda body: f'(({dn(x)}: {self.dtype(T)}) => {body})'
        text, cur = src, None
        if g.ifs:
            c, ct = self.pure(g.ifs[0], inner, ctx)
            if ct != BOOL:
                fail(g.ifs[0], 'truthiness', 'the condition is not a bool: compare explicitly')
            cur = lam(c)
            text = f'{self.filter_helper(T)}({text}, {cur})'
        e, et = self.pure(n.elt, inner, ctx)
        if not (isinstance(n.elt, ast.Name) and n.elt.id == x):
            # a map is the sequence of its elements, element by element: two maps whose element expressions agree on
            # every element are one sequence by extensionality, with no lemma about a recursive helper
            sv, iv = self.tmp('s'), self.tmp('i')
            text = (f'(var {sv} := {text}; seq(|{sv}|, {iv} requires 0 <= {iv} < |{sv}| => '
                    f'(var {dn(x)}: {self.dtype(T)} := {sv}[{iv}]; {e})))')
        elif cur is not None and {m.id for m in ast.walk(g.ifs[0]) if isinstance(m, ast.Name)} <= {x}:
            self._last_filter = (n, (x, cur))
        return s, text, ('list', et)

    def ex_Subscript(self, n, env, ctx, expected):
        s0, base, bt = self.ex(n.value, env, ctx)
        sl = n.slice
        if isinstance(sl, ast.Slice):
            if sl.step is not None:
                fail(sl, 'slice-step', 'a slice with a step is outside milestone 1')
            if bt[0] != 'list' and bt != STR:
                fail(n, 'mixed-types', f'slicing a {tstr(bt)}')
            steps = list(s0)
            lo, hi = '0', None
            if sl.lower is not None:
                s1, lo, lt = self.ex(sl.lower, env, ctx)
                steps += s1
            if sl.upper is not None:
                s2, hi, ht = self.ex(sl.upper, env, ctx)
                steps += s2
            b = self.tmp('s')
            steps.append(('let', b, base))
            return steps, f'{self.helper("PySlice")}({b}, {lo}, {hi if hi is not None else "|" + b + "|"})', bt
        if bt[0] == 'tuple':
            if not (isinstance(sl, ast.Constant) and isinstance(sl.value, int) and 0 <= sl.value < len(bt[1])):
                fail(sl, 'tuple-index', 'a tuple is indexed by an int literal in range')
            return s0, f'{base}.{sl.value}', bt[1][sl.value]
        s1, idx, it = self.ex(sl, env, ctx)
        steps = s0 + s1
        if not ctx.world:
            raise NeedsWorld()
        t = self.tmp()
        b, i = self.tmp('s'), self.tmp('i')
        steps += [('let', b, base), ('let', i, idx)]
        if bt[0] == 'list' or bt == STR:
            if it != INT:
                fail(sl, 'mixed-types', 'an index is an int')
            self.helper('PyIndexOk')
            self.helper('PyAt')
            rt = bt[1] if bt[0] == 'list' else STR
            val = f'PyAt({b}, {i})' if bt[0] == 'list' else f'[PyAt({b}, {i})]'
            steps += [('let', f'(wld, {t})', f'if PyIndexOk({b}, {i}) then (wld, {val}) else ({self.raise_text("IndexError")}, {self.fault_result(rt)})'),
                      self.check_step(ctx, env)]
            return steps, t, rt
        if bt[0] == 'dict':
            k = self.coerce(i, it, bt[1], sl)
            steps += [('let', f'(wld, {t})', f'if {k} in {b} then (wld, {b}[{k}]) else ({self.raise_text("KeyError")}, {self.fault_result(bt[2])})'),
                      self.check_step(ctx, env)]
            return steps, t, bt[2]
        fail(n, 'mixed-types', f'indexing a {tstr(bt)}')

    def ex_Attribute(self, n, env, ctx, expected):
        base = n.value
        if isinstance(base, ast.Name) and base.id == 'self' and self.cur.cls is not None and self.cur.cls.kind == 'plain':
            if not ctx.world:
                raise NeedsWorld()
            ft = self.check_type(self.class_fields(self.cur.cls).get(n.attr, ('unknown', 'self.' + n.attr)), n)
            getter = self.external(f'ext_{self.cur.cls.name}_get_{n.attr}', ['World', 'Ext_' + self.cur.cls.name], self.dtype(ft))
            self.dtype(('ext', self.cur.cls.name))
            return [], f'{getter}(wld, self)', ft
        s, v, t = self.ex(base, env, ctx)
        if t[0] == 'data':
            ci = self.mod.class_named(t[1])
            for f, ann, _ in ci.fields:
                if f == n.attr:
                    return s, f'{v}.{dn(f)}', self.check_type(ci.module.hint(ann), ann)
            fail(n, 'unsupported-member', f'{t[1]} has no field {n.attr}')
        if n.attr in ('__class__', '__dict__'):
            fail(n, 'prototype', f'{n.attr} reads the object model')
        fail(n, 'unsupported-member', f'.{n.attr} of a {tstr(t)} has no reading')

    # ----- calls -----
    def bind_args(self, call, params, rest, defaults, env, ctx, node_name, sb=None):
        """The arguments of a call in parameter order, coerced: (steps, [text]). `sb` collects the type
        parameters the arguments bind (a generic callee)."""
        sb = {} if sb is None else sb
        steps, out = [], {}
        names = [p[0] for p in params if p[0] != rest]
        pos = list(call.args)
        rest_vals = []
        for i, a in enumerate(pos):
            if isinstance(a, ast.Starred):
                if rest is None or i < len(names):
                    fail(a, 'spread', f'a starred argument to {node_name} needs a *{rest or "args"} parameter at that position')
                s, v, t = self.ex(a.value, env, ctx)
                rt = dict((p[0], p[1]) for p in params)[rest]
                if t[0] != 'list':
                    fail(a, 'spread', 'the starred value is a list')
                steps += s
                rest_vals.append(('seq', self.coerce(v, t, rt, a)))
                continue
            if i < len(names):
                pt = params[i][1]
                s, v, t = self.ex(a, env, ctx, subst(pt, sb))
                steps += s
                match(pt, t, sb)
                out[names[i]] = self.coerce(v, t, subst(pt, sb), a)
            elif rest is not None:
                rt = dict((p[0], p[1]) for p in params)[rest]
                s, v, t = self.ex(a, env, ctx, rt[1])
                steps += s
                rest_vals.append(('one', self.coerce(v, t, rt[1], a)))
            else:
                fail(a, 'param-form', f'too many arguments to {node_name}')
        for kw in call.keywords:
            if kw.arg is None:
                fail(kw, 'spread', '**kwargs in a call is outside milestone 1')
            if kw.arg not in names:
                fail(kw, 'param-form', f'{node_name} has no parameter {kw.arg}')
            pt = dict((p[0], p[1]) for p in params)[kw.arg]
            s, v, t = self.ex(kw.value, env, ctx, subst(pt, sb))
            steps += s
            match(pt, t, sb)
            out[kw.arg] = self.coerce(v, t, subst(pt, sb), kw.value)
        vals = []
        for nm, pt, _ in [p for p in params if p[0] != rest]:
            if nm in out:
                vals.append(out[nm])
            elif nm in defaults:
                s, v, t = self.ex(defaults[nm], env, ctx, pt)
                vals.append(self.coerce(v, t, pt, defaults[nm]))
            else:
                fail(call, 'param-form', f'{node_name} misses the argument {nm}')
        if rest is not None:
            parts, cur = [], []
            for kind, v in rest_vals:
                if kind == 'one':
                    cur.append(v)
                else:
                    if cur:
                        parts.append('[' + ', '.join(cur) + ']')
                        cur = []
                    parts.append(v)
            if cur or not parts:
                parts.append('[' + ', '.join(cur) + ']')
            vals.append(' + '.join(parts) if len(parts) > 1 else parts[0])
        return steps, vals

    def call_unit(self, call, uname, recv_text, env, ctx):
        u = self.units[uname]
        ps, rt, rest = self.unit_sig(u)
        sb = {}
        steps, vals = self.bind_args(call, ps, rest, self.defaults(u), env, ctx, uname, sb)
        rt = subst(rt, sb)
        callee_world = self.is_world(uname)
        args = []
        if uname in self.recursive:
            if self.cur.name in self.recursive and self.same_cycle(uname):
                args.append('fuel - 1')
            else:
                args.append(self.external('ext_fuel_start', [], 'nat') + '()')
        if callee_world:
            if not ctx.world:
                raise NeedsWorld()
            args.append('wld')
        if recv_text is not None:
            args.append(recv_text)
        args += vals
        text = f'{dafny_name(uname)}{self.sfx}({", ".join(args)})'
        if callee_world:
            t = self.tmp()
            return steps + [('let', f'(wld, {t})', text), self.check_step(ctx, env)], t, rt
        return steps, text, rt

    def same_cycle(self, other):
        g = self.call_graph() if not hasattr(self, '_g') else self._g
        self._g = g
        seen, todo = set(), [other]
        while todo:
            x = todo.pop()
            if x == self.cur.name:
                return True
            if x in seen:
                continue
            seen.add(x)
            todo.extend(g.get(x, ()))
        return False

    def ex_Call(self, n, env, ctx, expected):
        f = n.func
        if isinstance(f, ast.Name):
            name = f.id
            if name in self.local_names:
                fail(n, 'shadowed-name', f'{name} is a local name of this function: the call would call the local value')
            if name in self.units and self.units[name].cls is None:
                return self.call_unit(n, name, None, env, ctx)
            if name in ('eval', 'exec', 'compile', '__import__'):
                fail(n, 'dynamic-eval', f'{name} runs code built at run time')
            if name in ('getattr', 'setattr', 'hasattr', 'delattr', 'vars', 'type', 'super', 'globals', 'locals'):
                if name in ('getattr', 'hasattr') and len(n.args) >= 2 and isinstance(n.args[1], ast.Constant):
                    fail(n, 'prototype', f'{name} with a literal name: read the attribute directly')
                fail(n, 'prototype', f'{name} reads or changes the object model')
            if name == 'isinstance' or name == 'issubclass':
                fail(n, 'type-test', f'{name} is outside milestone 1: type the value')
            ci = self.mod.class_named(name)
            if ci is not None:
                return self.construct(n, ci, env, ctx)
            if name == 'replace' and self.mod.imports.get('replace', ('',))[0] == 'dataclasses':
                return self.dc_replace(n, env, ctx)
            if name in self.mod.imports:
                return self.imported_call(n, name, None, env, ctx)
            return self.builtin(n, name, env, ctx, expected)
        if isinstance(f, ast.Attribute):
            base = f.value
            if isinstance(base, ast.Name) and base.id == 'dataclasses' and f.attr == 'replace':
                return self.dc_replace(n, env, ctx)
            if isinstance(base, ast.Name) and base.id == 'self' and self.cur.cls is not None and 'self' in env.types:
                un = f'{self.cur.cls.name}.{f.attr}'
                if un in self.units:
                    return self.call_unit(n, un, 'self', env, ctx)
            if isinstance(base, ast.Name) and base.id not in env.types and base.id in self.mod.classes:
                un = f'{base.id}.{f.attr}'
                if un in self.units and self.self_type(self.units[un]) is None:
                    return self.call_unit(n, un, None, env, ctx)
                fail(n, 'unsupported-call', f'{un} is not a static method of this file')
            if isinstance(base, ast.Name) and base.id not in env.types and base.id in self.mod.imports:
                return self.imported_call(n, base.id, f.attr, env, ctx)
            s0, recv, rt = self.ex(base, env, ctx)
            m = f.attr
            if m in MUTATORS:
                if isinstance(base, ast.Name) and self.is_param(base.id):
                    fail(n, 'param-mutation', f'{m} changes the parameter {base.id} in place: return a new value instead')
                if rt[0] in ('list', 'dict'):
                    fail(n, 'collection-mutation', f'{m} changes a {tstr(rt)} in place: build the new value (xs + [x]) instead')
            if rt == STR:
                return self.str_method(n, m, s0, recv, env, ctx)
            if rt[0] == 'dict':
                if m == 'get':
                    if len(n.args) not in (1, 2) or n.keywords:
                        fail(n, 'unsupported-call', 'dict.get(key) or dict.get(key, default)')
                    s1, k, kt = self.ex(n.args[0], env, ctx, rt[1])
                    k = self.coerce(k, kt, rt[1], n.args[0])
                    b = self.tmp('m')
                    if len(n.args) == 2:
                        s2, d, dt = self.ex(n.args[1], env, ctx, rt[2])
                        d = self.coerce(d, dt, rt[2], n.args[1])
                        return s0 + s1 + s2 + [('let', b, recv)], f'(if {k} in {b} then {b}[{k}] else {d})', rt[2]
                    self.need_option()
                    return s0 + s1 + [('let', b, recv)], f'(if {k} in {b} then Some({b}[{k}]) else None)', ('opt', rt[2])
                if m in ('keys', 'values', 'items', '__iter__'):
                    fail(n, 'dict-order', f'dict.{m}() observes insertion order, which a map does not keep')
                fail(n, 'unsupported-call', f'dict.{m} is outside milestone 1')
            if rt[0] == 'list':
                fail(n, 'list-method', f'list.{m} is outside milestone 1')
            if rt[0] == 'data':
                un = f'{rt[1]}.{m}'
                if un in self.units:
                    b = self.tmp('r')
                    steps, v, t = self.call_unit(n, un, b, env, ctx)
                    return s0 + [('let', b, recv)] + steps, v, t
                fail(n, 'unsupported-call', f'{rt[1]} has no method {m} in this file')
            if rt[0] == 'ext':
                ci = self.mod.class_named(rt[1])
                if ci is not None and ci.module is self.mod and ci.kind == 'plain':
                    un = f'{rt[1]}.{m}'
                    if un not in self.units:
                        fail(n, 'unsupported-call', f'{rt[1]} has no method {m}')
                    b = self.tmp('r')
                    steps, v, t = self.call_unit(n, un, b, env, ctx)
                    return s0 + [('let', b, recv)] + steps, v, t
                return self.method_transition(n, rt[1], ci, m, s0, recv, env, ctx)
            fail(n, 'unsupported-call', f'.{m}() on a {tstr(rt)} has no reading')
        fail(n, 'unsupported-call', 'a call of a computed function')

    def method_transition(self, n, cname, ci, m, s0, recv, env, ctx):
        """A method of an outside object (a Protocol or an imported class): a transition of the world."""
        if ci is None:
            fail(n, 'unresolved-type', f'{cname} is not defined in this file or a sibling module: its methods have no types')
        md = ci.methods.get(m)
        if md is None:
            fail(n, 'unsupported-call', f'{cname} declares no method {m}')
        if isinstance(md, ast.AsyncFunctionDef):
            fail(n, 'async', f'{cname}.{m} is async: outside milestone 1')
        ps = [(a.arg, ci.module.hint(a.annotation), a) for a in md.args.args[1:]]
        for p in ps:
            self.check_type(p[1], n)
        rt = self.check_type(ci.module.hint(md.returns), n) if md.returns is not None else NONE
        self.crossing(n, ps, rt, ci.module, f'{cname}.{m}')
        steps, vals = self.bind_args(n, ps, None, {}, env, ctx, f'{cname}.{m}')
        if not ctx.world:
            raise NeedsWorld()
        rd = self.dtype(rt)
        name = self.external(f'ext_call_{cname}_{m}', ['World', self.dtype(('ext', cname))] + [self.dtype(p[1]) for p in ps], f'(World, {rd})')
        t = self.tmp()
        return s0 + steps + [('let', f'(wld, {t})', f'{name}(wld, {", ".join([recv] + vals)})'), self.check_step(ctx, env)], t, rt

    def imported_call(self, n, name, attr, env, ctx):
        """A function, or a static method of a class, imported from another module: a transition of the world."""
        imp = self.mod.imported(name)
        mod, orig, sib = imp
        if mod.split('.')[0] in LANGUAGE_MODULES:
            fail(n, 'unsupported-call', f'{name}{"." + attr if attr else ""} from {mod} has no reading')
        if sib is None:
            fail(n, 'unresolved-import', f'{name} comes from {mod}, which is not a sibling module: its signature is unknown')
        if attr is None:
            fd = sib.functions.get(orig)
            label = orig
            if fd is None:
                fail(n, 'unresolved-import', f'{mod} defines no function {orig}')
            ps = [(a.arg, sib.hint(a.annotation), a) for a in fd.args.args]
        else:
            ci = sib.classes.get(orig)
            fd = ci.methods.get(attr) if ci else None
            label = f'{orig}_{attr}'
            if fd is None or 'staticmethod' not in [d.id for d in fd.decorator_list if isinstance(d, ast.Name)]:
                fail(n, 'unresolved-import', f'{orig}.{attr} is not a static method of {mod}')
            ps = [(a.arg, sib.hint(a.annotation), a) for a in fd.args.args]
        if isinstance(fd, ast.AsyncFunctionDef):
            fail(n, 'async', 'an async import is outside milestone 1')
        for p in ps:
            self.check_type(p[1], n)
            if p[1][0] == 'data':
                self.datatype_from(sib, p[1][1])
        rt = self.check_type(sib.hint(fd.returns), n) if fd.returns is not None else NONE
        self.crossing(n, ps, rt, sib, label)
        steps, vals = self.bind_args(n, ps, None, {}, env, ctx, label)
        if not ctx.world:
            raise NeedsWorld()
        rd = self.dtype(rt)
        fn = self.external(f'ext_call_{mangle(mod)}_{label}', ['World'] + [self.dtype(p[1]) for p in ps], f'(World, {rd})')
        t = self.tmp()
        return steps + [('let', f'(wld, {t})', f'{fn}({", ".join(["wld"] + vals)})'), self.check_step(ctx, env)], t, rt

    def crossing(self, n, ps, rt, mod, label):
        """A value handed to the outside, or received from it, is shared with the world: only values no one can
        change cross at milestone 1 (the heap reading of shared mutable values is milestone 2)."""
        for name, t, _ in ps:
            if not immutable(t, mod):
                fail(n, 'mutable-argument', f'{label} receives {name}: {tstr(t)}, a value the outside can change after the call: pass an immutable value (a tuple, a frozen dataclass)')
        if not immutable(rt, mod):
            fail(n, 'mutable-result', f'{label} returns a {tstr(rt)} the outside may keep and change: return an immutable value')

    def datatype_from(self, sib, name):
        if self.mod.class_named(name) is None:
            fail(None, 'unresolved-type', f'{name} is a dataclass of another module that this file does not import')

    def construct(self, n, ci, env, ctx):
        if ci.kind == 'data':
            params = [(f, ci.module.hint(a), a) for f, a, _ in ci.fields]
            for p in params:
                self.check_type(p[1], p[2])
            defaults = {f: d for f, a, d in ci.fields if d is not None}
            for f, d in defaults.items():
                if not (isinstance(d, ast.Constant) and type(d.value) in (int, str, bool, type(None))):
                    fail(d, 'param-form', f'the default of {ci.name}.{f} is not a literal')
            steps, vals = self.bind_args(n, params, None, defaults, env, ctx, ci.name)
            self.datatype(ci.name)
            return steps, f'{dn(ci.name)}({", ".join(vals)})', ('data', ci.name)
        if ci.kind == 'plain' and ci.module is self.mod:
            if not ctx.world:
                raise NeedsWorld()
            ext = self.dtype(('ext', ci.name))
            alloc = self.external(f'ext_alloc_{ext}_World', ['World'], f'(World, {ext})')
            o = self.tmp()
            steps = [('let', f'(wld, {o})', f'{alloc}(wld)'), self.check_step(ctx, env)]
            un = f'{ci.name}.__init__'
            if un in self.units:
                s2, v, t = self.call_unit(n, un, o, env, ctx)
                steps += s2
            elif n.args or n.keywords:
                fail(n, 'param-form', f'{ci.name} takes no arguments')
            return steps, o, ('ext', ci.name)
        fail(n, 'unsupported-call', f'constructing {ci.name} (a {ci.kind} class of another module) is outside milestone 1')

    def dc_replace(self, n, env, ctx):
        if len(n.args) != 1:
            fail(n, 'unsupported-call', 'replace(value, field=...)')
        s, v, t = self.ex(n.args[0], env, ctx)
        if t[0] != 'data':
            fail(n, 'mixed-types', 'replace takes a dataclass value')
        ci = self.mod.class_named(t[1])
        fields = {f: ci.module.hint(a) for f, a, _ in ci.fields}
        b = self.tmp('r')
        steps = s + [('let', b, v)]
        ups = []
        for kw in n.keywords:
            if kw.arg not in fields:
                fail(kw, 'unsupported-member', f'{t[1]} has no field {kw.arg}')
            s2, x, xt = self.ex(kw.value, env, ctx, fields[kw.arg])
            steps += s2
            ups.append(f'{dn(kw.arg)} := {self.coerce(x, xt, fields[kw.arg], kw.value)}')
        return steps, f'{b}.({", ".join(ups)})' if ups else b, t

    def str_method(self, n, m, s0, recv, env, ctx):
        if m in ('startswith', 'endswith'):
            if len(n.args) != 1 or n.keywords:
                fail(n, 'string-method', f'str.{m} with one str argument')
            s1, a, at = self.ex(n.args[0], env, ctx)
            if at != STR:
                fail(n, 'string-method', f'str.{m} with a tuple or a non-str argument is outside milestone 1')
            h = self.helper('PyStartsWith' if m == 'startswith' else 'PyEndsWith')
            return s0 + s1, f'{h}({recv}, {a})', BOOL
        if m == 'join':
            s1, a, at = self.ex(n.args[0], env, ctx)
            if at != ('list', STR):
                fail(n, 'string-method', 'str.join of a list of str')
            return s0 + s1, f'{self.helper("PyJoin")}({recv}, {a})', STR
        if m in STR_UNINTERP and not n.args and not n.keywords:
            return s0, self.external(f'ext_str_{m}', ['string'], 'string') + f'({recv})', STR
        if m == 'replace' and len(n.args) == 2:
            s1, a, at = self.ex(n.args[0], env, ctx)
            s2, b, bt = self.ex(n.args[1], env, ctx)
            if at != STR or bt != STR:
                fail(n, 'string-method', 'str.replace of two str')
            return s0 + s1 + s2, self.external('ext_str_replace', ['string', 'string', 'string'], 'string') + f'({recv}, {a}, {b})', STR
        fail(n, 'string-method', f'str.{m} is outside milestone 1 (startswith, endswith, join, replace, case and strip methods read)')

    def builtin(self, n, name, env, ctx, expected):
        args = n.args
        if n.keywords:
            fail(n, 'unsupported-call', f'{name} with keyword arguments')
        if name == 'len' and len(args) == 1:
            s, v, t = self.ex(args[0], env, ctx)
            if t[0] in ('list', 'dict') or t == STR:
                return s, f'|{v}|', INT
            fail(n, 'mixed-types', f'len of a {tstr(t)}')
        if name == 'abs' and len(args) == 1:
            s, v, t = self.ex(args[0], env, ctx)
            if t != INT:
                fail(n, 'mixed-types', 'abs of an int')
            b = self.tmp('a')
            return s + [('let', b, v)], f'(if {b} < 0 then -{b} else {b})', INT
        if name in ('min', 'max') and len(args) == 2:
            s1, a, ta = self.ex(args[0], env, ctx)
            s2, b, tb = self.ex(args[1], env, ctx)
            if ta != INT or tb != INT:
                fail(n, 'mixed-types', f'{name} of two ints')
            x, y = self.tmp('a'), self.tmp('b')
            # Python returns the first of equal items; on ints the value is the same
            cmp = '<' if name == 'max' else '>'
            return s1 + s2 + [('let', x, a), ('let', y, b)], f'(if {x} {cmp} {y} then {y} else {x})', INT
        if name == 'sum' and len(args) == 1:
            s, v, t = self.ex(args[0], env, ctx)
            if t != ('list', INT):
                fail(n, 'mixed-types', 'sum of a list of ints')
            return s, f'{self.helper("PySum")}({v})', INT
        if name == 'str' and len(args) == 1:
            s, v, t = self.ex(args[0], env, ctx)
            return s, self.to_str(v, t, n), STR
        if name == 'list' and len(args) == 1:
            s, v, t = self.ex(args[0], env, ctx)
            if t[0] == 'list':
                return s, v, t
            if t[0] == 'dict':
                fail(n, 'dict-order', 'list(d) observes insertion order')
            fail(n, 'unsupported-call', f'list of a {tstr(t)}')
        if name == 'dict' and len(args) == 1:
            s, v, t = self.ex(args[0], env, ctx)
            if t[0] == 'dict':
                return s, v, t
            fail(n, 'unsupported-call', f'dict of a {tstr(t)}')
        if name == 'int' and len(args) == 1:
            s, v, t = self.ex(args[0], env, ctx)
            if t == INT:
                return s, v, INT
            if t != STR:
                fail(n, 'mixed-types', f'int of a {tstr(t)}')
            if not ctx.world:
                raise NeedsWorld()
            ok = self.external('ext_int_parses', ['string'], 'bool')
            of = self.external('ext_int_of_string', ['string'], 'int')
            r, b = self.tmp(), self.tmp('s')
            return s + [('let', b, v), ('let', f'(wld, {r})', f'if {ok}({b}) then (wld, {of}({b})) else ({self.raise_text("ValueError", self.external("ext_int_error_message", ["string"], "string") + "(" + b + ")")}, {self.fault_result(INT)})'),
                        self.check_step(ctx, env)], r, INT
        if name == 'print':
            if not ctx.world:
                raise NeedsWorld()
            steps, vals = [], []
            for a in args:
                s, v, t = self.ex(a, env, ctx)
                steps += s
                vals.append(self.to_str(v, t, a))
            fn = self.external('ext_print_string', ['World', 'string'], 'World')
            return steps + [('let', 'wld', f'{fn}(wld, {" + \" \" + ".join(vals) if vals else chr(34) * 2})')], 'Unit', NONE
        if name == 'bool':
            fail(n, 'truthiness', 'bool(x) reads truthiness: compare explicitly')
        if name in ('float', 'round', 'divmod', 'pow'):
            fail(n, 'float', f'{name} is outside milestone 1')
        if name in ('open', 'input'):
            fail(n, 'unsupported-call', f'{name} touches the file system or the terminal: take a port parameter')
        if name in ('sorted', 'reversed', 'enumerate', 'zip', 'map', 'filter', 'iter', 'next', 'any', 'all', 'set', 'frozenset', 'id', 'hash'):
            fail(n, 'unsupported-call', f'{name} is outside milestone 1')
        fail(n, 'unsupported-call', f'{name} is not a function of this file, a sibling module, or a read built-in')

    # ----- output -----
    def output(self, texts, order, out_path, prelude_path):
        lines = [f'// Generated by lean-py translate (milestone 1) from {os.path.basename(self.path)}, all functions. int is int, str is string.',
                 '// Do not edit: the gate regenerates this file.',
                 '// EFFECTFUL: ' + ','.join(sorted(n for n in order if n in self.world))]
        blocks = [(k, v) for k, v in self.prelude.items() if v]
        if prelude_path:
            pre = ['// Generated by lean-py translate (milestone 1): shared declarations. Identical for parent and candidate, or the gate refuses.']
            for k, v in blocks:
                pre += [f'// PRELUDE {k}', v, '// END PRELUDE']
            with open(prelude_path, 'w') as fh:
                fh.write('\n'.join(pre) + '\n')
            lines.append(f'include "{os.path.basename(prelude_path)}"')
        else:
            lines += [v for _, v in blocks]
        lines.append('')
        lines += [t + '\n' for t in texts]
        with open(out_path, 'w') as fh:
            fh.write('\n'.join(lines))


def translate_file(path, out, prelude=None, suffix='', effectful=(), only=None):
    from lint import lint_rules  # the subset gate runs first
    found = lint_rules(path)
    if found:
        return 1, found
    tr = Translator(path, suffix, effectful, only)
    try:
        texts, order = tr.translate_all()
    except Unsupported as e:
        return 1, [e.where(path)]
    tr.output(texts, order, out, prelude)
    return 0, []


def main(argv):
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('file')
    ap.add_argument('--core', action='store_true')
    ap.add_argument('--out', required=True)
    ap.add_argument('--prelude')
    ap.add_argument('--suffix', default='')
    ap.add_argument('--effectful', default='')
    ap.add_argument('--only', default='')
    a = ap.parse_args(argv)
    eff = [x for x in a.effectful.split(',') if x]
    only = [x for x in a.only.split(',') if x] or None
    sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'lint'))
    rc, msgs = translate_file(a.file, a.out, a.prelude, a.suffix, eff, only)
    if rc:
        print('outside the subset:')
        for m in msgs:
            print('  ' + m)
        return 1
    print(f'wrote {a.out}' + (f' and {a.prelude}' if a.prelude else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
