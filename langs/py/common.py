"""lean-py common: the units of a Python file, its classes, and the typed surface read from its type hints.

Shared by the lint, the translator and lane B. Standard library only; safe under `python3 -I`.

A type is a tuple:
  ('int',) ('bool',) ('str',) ('none',)        scalars; `None` as a return type is the unit value
  ('list', T)  ('tuple', [T, ...])  ('dict', K, V)  ('opt', T)
  ('data', name)     a dataclass of this file or of a sibling module (a value)
  ('ext', name)      a class read as an opaque reference: a Protocol, a plain class, an imported class
  ('tvar', name)     a type parameter (`T = TypeVar("T")`)
  ('float',) ('any',) ('callable',) ('unknown', text)   read only to refuse by name
"""
import ast, os, re

BUILTIN_EXC = {'Exception', 'ValueError', 'KeyError', 'IndexError', 'TypeError', 'RuntimeError', 'ZeroDivisionError',
               'LookupError', 'ArithmeticError', 'AssertionError', 'NotImplementedError', 'PermissionError',
               'FileNotFoundError', 'OSError', 'TimeoutError', 'ConnectionError'}
LANGUAGE_MODULES = {'typing', 'dataclasses', '__future__', 'typing_extensions', 'abc'}


class Unit:
    """One checkable function: a top-level `def`, or a method of a top-level class (`Class.method`)."""

    def __init__(self, name, node, cls=None):
        self.name, self.node, self.cls = name, node, cls

    @property
    def method(self):
        return self.node.name

    def __repr__(self):
        return f'Unit({self.name})'


class ClassInfo:
    def __init__(self, node, kind, fields, module=None):
        self.node, self.name, self.kind, self.fields, self.module = node, node.name, kind, fields, module
        # kind: 'data' (a dataclass), 'protocol', 'plain', 'other'
        self.frozen = False
        self.methods = {m.name: m for m in node.body if isinstance(m, ast.FunctionDef)}


def snake(n):
    n = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', n)
    n = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', n)
    return n.lower()


RESERVED = set('''abstract allocated as assert assume bool break by calc case char class codatatype const constructor datatype
decreases else ensures exists expect export extends false forall fp function ghost if import in include inductive int invariant
is iterator label lemma map match method modifies modify module multiset nameonly nat new newtype null object old opaque predicate
print provides reads real refines requires return returns reveal seq set static string then this trait true type unchanged var while
witness yield yields result Option None Some value Nullish Absent Null Undef fresh twostate ORDINAL array iset imap bv least greatest
continue default extern exports synthesize World Any Unit wld fuel'''.split())


def dn(name):
    n = re.sub(r'[^A-Za-z0-9_]', '_', name)
    if n.startswith('_'):
        n = 'u' + n
    return n + '_' if n in RESERVED else n


def dafny_name(unit_name):
    """The Dafny name of a unit: `sum_positive`, `chat_service_label`, `guard_constructor` (`__init__`)."""
    if '.' in unit_name:
        c, m = unit_name.split('.', 1)
        m = 'constructor' if m == '__init__' else m
        return dn(snake(c) + '_' + (snake(m) if not m.startswith('_') else 'u' + m))
    return dn(snake(unit_name))


def decorator_names(node):
    out = []
    for d in getattr(node, 'decorator_list', []):
        t = d.func if isinstance(d, ast.Call) else d
        if isinstance(t, ast.Name):
            out.append(t.id)
        elif isinstance(t, ast.Attribute):
            out.append(t.attr)
        else:
            out.append('?')
    return out


def is_dataclass(node):
    return 'dataclass' in decorator_names(node)


def dataclass_frozen(node):
    for d in node.decorator_list:
        if isinstance(d, ast.Call):
            for k in d.keywords:
                if k.arg == 'frozen' and isinstance(k.value, ast.Constant) and k.value.value is True:
                    return True
    return False


def dataclass_eq(node):
    for d in node.decorator_list:
        if isinstance(d, ast.Call):
            for k in d.keywords:
                if k.arg == 'eq' and isinstance(k.value, ast.Constant) and k.value.value is False:
                    return False
    return True


def base_names(node):
    out = []
    for b in node.bases:
        if isinstance(b, ast.Name):
            out.append(b.id)
        elif isinstance(b, ast.Attribute):
            out.append(b.attr)
        elif isinstance(b, ast.Subscript) and isinstance(b.value, ast.Name):
            out.append(b.value.id)
        else:
            out.append('?')
    return out


def class_kind(node):
    bases = base_names(node)
    if is_dataclass(node):
        return 'data' if not bases else 'other'
    if bases and all(b in ('Protocol', 'Generic') for b in bases) and 'Protocol' in bases:
        return 'protocol'
    if not bases or bases == ['object']:
        return 'plain'
    return 'other'


class Module:
    """A parsed Python file: its units, classes, imports, type parameters, and sibling modules for imported names."""

    def __init__(self, path, text=None, _seen=None):
        self.path = os.path.abspath(path)
        self.text = open(path).read() if text is None else text
        self.tree = ast.parse(self.text, filename=path)
        self.dir = os.path.dirname(self.path)
        self.classes, self.functions, self.tvars, self.consts = {}, {}, set(), {}
        self.imports = {}  # local name -> (module, original name or None for `import m`)
        self._siblings = {}
        self._seen = (_seen or set()) | {self.path}
        for st in self.tree.body:
            if isinstance(st, ast.FunctionDef):
                self.functions[st.name] = st
            elif isinstance(st, ast.ClassDef):
                kind = class_kind(st)
                fields = []
                if kind == 'data':
                    for b in st.body:
                        if isinstance(b, ast.AnnAssign) and isinstance(b.target, ast.Name):
                            fields.append((b.target.id, b.annotation, b.value))
                ci = ClassInfo(st, kind, fields, self)
                ci.frozen = kind == 'data' and dataclass_frozen(st)
                self.classes[st.name] = ci
            elif isinstance(st, ast.ImportFrom):
                for a in st.names:
                    self.imports[a.asname or a.name] = ((st.module or '').lstrip('.'), a.name, st.level)
            elif isinstance(st, ast.Import):
                for a in st.names:
                    self.imports[a.asname or a.name.split('.')[0]] = (a.name, None, 0)
            elif isinstance(st, ast.Assign) and len(st.targets) == 1 and isinstance(st.targets[0], ast.Name):
                v = st.value
                if isinstance(v, ast.Call) and isinstance(v.func, ast.Name) and v.func.id == 'TypeVar':
                    self.tvars.add(st.targets[0].id)
                elif isinstance(v, ast.Constant) and isinstance(v.value, (int, str, bool)) and not isinstance(v.value, float):
                    self.consts[st.targets[0].id] = v
            elif isinstance(st, ast.AnnAssign) and isinstance(st.target, ast.Name) and isinstance(st.value, ast.Constant):
                if isinstance(st.value.value, (int, str, bool)):
                    self.consts[st.target.id] = st.value

    # ----- units -----
    def units(self):
        out = []
        for st in self.tree.body:
            if isinstance(st, ast.FunctionDef) or isinstance(st, ast.AsyncFunctionDef):
                out.append(Unit(st.name, st))
            elif isinstance(st, ast.ClassDef):
                ci = self.classes.get(st.name)
                if ci and ci.kind == 'protocol':
                    continue  # an interface: its methods have no bodies to check
                for m in st.body:
                    if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        out.append(Unit(f'{st.name}.{m.name}', m, ci))
        return out

    def unit(self, name):
        return next((u for u in self.units() if u.name == name), None)

    # ----- imported names -----
    def sibling(self, modname, level=1):
        """The sibling module `modname` in the same folder, parsed; None when absent."""
        key = modname
        if key in self._siblings:
            return self._siblings[key]
        m = None
        if modname and modname.split('.')[0] not in LANGUAGE_MODULES:
            p = os.path.join(self.dir, *modname.split('.')) + '.py'
            if os.path.isfile(p) and os.path.abspath(p) not in self._seen:
                try:
                    m = Module(p, _seen=self._seen)
                except SyntaxError:
                    m = None
        self._siblings[key] = m
        return m

    def imported(self, name):
        """(module name, original name, Module or None) for an imported name; None when not imported."""
        if name not in self.imports:
            return None
        mod, orig, level = self.imports[name]
        return mod, orig, self.sibling(mod, level)

    def class_named(self, name):
        """The ClassInfo for a class name visible in this file (defined here or imported from a sibling)."""
        if name in self.classes:
            return self.classes[name]
        imp = self.imported(name)
        if imp and imp[2] and imp[1] in imp[2].classes:
            return imp[2].classes[imp[1]]
        return None

    # ----- type hints -----
    def hint(self, ann):
        """The type a hint names (see the module docstring)."""
        if ann is None:
            return ('any',)
        if isinstance(ann, ast.Constant):
            if ann.value is None:
                return ('none',)
            if isinstance(ann.value, str):  # a forward reference
                try:
                    return self.hint(ast.parse(ann.value, mode='eval').body)
                except SyntaxError:
                    return ('unknown', ann.value)
            return ('unknown', repr(ann.value))
        if isinstance(ann, ast.Name):
            n = ann.id
            if n == 'int':
                return ('int',)
            if n == 'bool':
                return ('bool',)
            if n == 'str':
                return ('str',)
            if n == 'float' or n == 'complex':
                return ('float',)
            if n == 'None':
                return ('none',)
            if n == 'Any' or n == 'object':
                return ('any',)
            if n in self.tvars:
                return ('tvar', n)
            ci = self.class_named(n)
            if ci:
                if ci.kind == 'data':
                    return ('data', n)
                return ('ext', n)
            if n in ('list', 'List', 'Sequence', 'tuple', 'Tuple', 'dict', 'Dict', 'Mapping'):
                return ('unknown', n + ' without element type')
            if n in self.imports:
                return ('ext', n)
            return ('unknown', n)
        if isinstance(ann, ast.Attribute):
            return ('unknown', ast.unparse(ann))
        if isinstance(ann, ast.BinOp) and isinstance(ann.op, ast.BitOr):
            l, r = self.hint(ann.left), self.hint(ann.right)
            if r == ('none',) and l != ('none',):
                return ('opt', l)
            if l == ('none',) and r != ('none',):
                return ('opt', r)
            return ('unknown', ast.unparse(ann))
        if isinstance(ann, ast.Subscript):
            head = ann.value.id if isinstance(ann.value, ast.Name) else (ann.value.attr if isinstance(ann.value, ast.Attribute) else '?')
            args = ann.slice.elts if isinstance(ann.slice, ast.Tuple) else [ann.slice]
            if head in ('list', 'List', 'Sequence'):
                return ('list', self.hint(args[0]))
            if head in ('tuple', 'Tuple'):
                if len(args) == 2 and isinstance(args[1], ast.Constant) and args[1].value is Ellipsis:
                    return ('list', self.hint(args[0]))
                return ('tuple', [self.hint(a) for a in args])
            if head in ('dict', 'Dict', 'Mapping'):
                return ('dict', self.hint(args[0]), self.hint(args[1]))
            if head == 'Optional':
                return ('opt', self.hint(args[0]))
            if head == 'Union':
                hs = [self.hint(a) for a in args]
                rest = [h for h in hs if h != ('none',)]
                if len(rest) == 1 and len(hs) == 2:
                    return ('opt', rest[0])
                return ('unknown', ast.unparse(ann))
            if head == 'Callable':
                return ('callable',)
            return ('unknown', ast.unparse(ann))
        return ('unknown', ast.unparse(ann))


def bad_type(t):
    """The first part of a type that has no reading, as (rule, text); None when every part reads."""
    k = t[0]
    if k == 'float':
        return ('float', 'float has no exact reading at milestone 1: use int')
    if k == 'any':
        return ('untyped', 'a value without a type hint (or Any/object): write the type')
    if k == 'callable':
        return ('function-value', 'a function value (Callable) is outside milestone 1')
    if k == 'unknown':
        return ('unsupported-type', f'type {t[1]} has no reading')
    if k == 'list' or k == 'opt':
        return bad_type(t[1])
    if k == 'tuple':
        for x in t[1]:
            b = bad_type(x)
            if b:
                return b
    if k == 'dict':
        return bad_type(t[1]) or bad_type(t[2])
    return None


def tstr(t):
    """A readable type, for messages."""
    k = t[0]
    if k in ('int', 'bool', 'str', 'none', 'float', 'any', 'callable'):
        return k
    if k == 'list':
        return f'list[{tstr(t[1])}]'
    if k == 'tuple':
        return 'tuple[' + ', '.join(tstr(x) for x in t[1]) + ']'
    if k == 'dict':
        return f'dict[{tstr(t[1])}, {tstr(t[2])}]'
    if k == 'opt':
        return f'Optional[{tstr(t[1])}]'
    return t[1] if len(t) > 1 else k


def decreases_hint(text, lineno):
    """`# @decreases <expr>` on the line of a `while` or on the line just above it."""
    lines = text.split('\n')
    for ln in (lineno - 1, lineno - 2):
        if 0 <= ln < len(lines):
            m = re.search(r'#\s*@decreases\s+(.+?)\s*$', lines[ln])
            if m:
                return m.group(1)
    return None
