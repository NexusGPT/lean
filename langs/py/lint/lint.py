"""lean-py lint: is every function of a Python file inside the milestone 1 subset?

    python3 -I langs/py/lint/lint.py <file.py> [--json]

Exit 0 and "inside the subset", or exit 1 with one finding per line: `file:line:col rule message`.

Two passes. The rules below name the constructs the subset refuses on sight (the same rule names as the TypeScript
lint where the construct is the same). Then the translator runs on every unit, and anything it cannot read is a
finding with the rule it names: the lint admits exactly what the translator reads.
"""
import ast, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'translate'))
from common import Module, decorator_names, decreases_hint, class_kind  # noqa: E402

PROTO = {'getattr', 'setattr', 'hasattr', 'delattr', 'vars', 'type', 'globals', 'locals', 'super'}
MUTATORS = {'append', 'extend', 'insert', 'pop', 'remove', 'clear', 'sort', 'reverse', 'update', 'setdefault',
            'popitem', 'add', 'discard'}


def lint_rules(path, text=None):
    """The syntactic rules: a list of findings `file:line:col rule message`."""
    out = []
    try:
        mod = Module(path, text)
    except SyntaxError as e:
        return [f'{path}:{e.lineno or 1}:{(e.offset or 0)}  syntax  {e.msg}']

    def v(node, rule, msg):
        out.append(f'{path}:{getattr(node, "lineno", 1)}:{getattr(node, "col_offset", 0) + 1}  {rule}  {msg}')

    for st in mod.tree.body:
        if isinstance(st, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue
        if isinstance(st, ast.ImportFrom):
            if any(a.name == '*' for a in st.names):
                v(st, 'import', '`import *` hides where a name comes from: import names')
            continue
        if isinstance(st, ast.Import):
            continue
        if isinstance(st, ast.Expr) and isinstance(st.value, ast.Constant) and isinstance(st.value.value, str):
            continue
        if isinstance(st, ast.Assign) and len(st.targets) == 1 and isinstance(st.targets[0], ast.Name):
            val = st.value
            if isinstance(val, ast.Call) and isinstance(val.func, ast.Name) and val.func.id == 'TypeVar':
                continue
            if isinstance(val, ast.Constant) and type(val.value) in (int, str, bool):
                continue
            if isinstance(val, ast.Constant) and isinstance(val.value, float):
                v(st, 'float', 'a float constant has no exact reading at milestone 1')
                continue
            v(st, 'toplevel-state', f'module variable {st.targets[0].id} holds a value built at import: a constant literal or a parameter')
            continue
        if isinstance(st, ast.AnnAssign) and isinstance(st.target, ast.Name) and isinstance(st.value, ast.Constant):
            continue
        if isinstance(st, ast.If) and isinstance(st.test, ast.Compare) and isinstance(st.test.left, ast.Name) and st.test.left.id == '__name__':
            continue
        v(st, 'toplevel-effect', 'a statement at module level runs on import: move it into a function')

    for st in mod.tree.body:
        if isinstance(st, ast.ClassDef):
            for k in st.keywords:
                if k.arg == 'metaclass':
                    v(st, 'prototype', 'a metaclass changes how the class is built')
            kind = class_kind(st)
            if kind == 'other':
                v(st, 'inheritance', f'class {st.name} has a base class: inheritance is outside milestone 1')
            for d in st.decorator_list:
                name = decorator_names(st)[st.decorator_list.index(d)]
                if name != 'dataclass':
                    v(d, 'decorator', f'class decorator {name} changes the class: outside milestone 1')

    for u in mod.units():
        fn = u.node
        if isinstance(fn, ast.AsyncFunctionDef):
            v(fn, 'async', f'{u.name} is async: outside milestone 1')
        for d, name in zip(fn.decorator_list, decorator_names(fn)):
            if name != 'staticmethod' or u.cls is None:
                v(d, 'decorator', f'decorator {name} wraps the function: outside milestone 1')
        a = fn.args
        params = set()
        all_args = list(a.posonlyargs) + list(a.args) + list(a.kwonlyargs)
        for i, p in enumerate(all_args):
            params.add(p.arg)
            if u.cls is not None and i == 0 and p.arg == 'self':
                continue
            if p.annotation is None:
                v(p, 'untyped-parameter', f'parameter {p.arg} has no type hint: write its type')
        if a.vararg:
            params.add(a.vararg.arg)
            if a.vararg.annotation is None:
                v(a.vararg, 'rest-parameters', f'*{a.vararg.arg} has no type hint: write the element type')
        if a.kwarg:
            v(a.kwarg, 'rest-parameters', f'**{a.kwarg.arg} is outside milestone 1')
        if fn.returns is None and fn.name != '__init__':
            v(fn, 'untyped-return', f'{u.name} has no return type hint: write `-> T`')
        for n in ast.walk(fn):
            if n is fn:
                continue
            if isinstance(n, (ast.Yield, ast.YieldFrom)):
                v(n, 'generator', 'a generator is outside milestone 1')
            elif isinstance(n, (ast.Await, ast.AsyncFor, ast.AsyncWith)):
                v(n, 'async', 'async code is outside milestone 1')
            elif isinstance(n, ast.Lambda):
                v(n, 'function-value', 'a lambda is a function value: outside milestone 1')
            elif isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                v(n, 'function-value', 'a nested function is a function value: outside milestone 1')
            elif isinstance(n, (ast.Global, ast.Nonlocal)):
                v(n, 'closure-mutation', f'`{type(n).__name__.lower()}` writes a variable outside the function')
            elif isinstance(n, ast.Delete):
                v(n, 'delete', '`del` changes a value in place: build the new value instead')
            elif isinstance(n, ast.Call) and isinstance(n.func, ast.Name):
                if n.func.id in ('eval', 'exec', 'compile', '__import__'):
                    v(n, 'dynamic-eval', f'{n.func.id} runs code built at run time')
                elif n.func.id in PROTO:
                    v(n, 'prototype', f'{n.func.id} reads or changes the object model')
            elif isinstance(n, ast.Attribute) and n.attr in ('__class__', '__dict__', '__getattr__', '__setattr__'):
                v(n, 'prototype', f'{n.attr} reads or changes the object model')
            elif isinstance(n, ast.Compare):
                for op, r in zip(n.ops, n.comparators):
                    if isinstance(op, (ast.Is, ast.IsNot)):
                        left = n.left if op is n.ops[0] else None
                        if not (isinstance(r, ast.Constant) and r.value is None) and not (isinstance(left, ast.Constant) and left.value is None):
                            v(n, 'identity', '`is` compares object identity: use == on values (or `is None`)')
            elif isinstance(n, ast.While):
                if decreases_hint(mod.text, n.lineno) is None:
                    v(n, 'unbounded-while', 'a while loop needs `# @decreases <expr>` on its line or the line above')
            elif isinstance(n, ast.Constant) and isinstance(n.value, float):
                v(n, 'float', 'a float literal has no exact reading at milestone 1: use int')
            elif isinstance(n, ast.BinOp) and isinstance(n.op, ast.Div):
                v(n, 'division', '/ is true division (a float): use // on ints')
            # a parameter changed in place: the caller sees it
            tgt = None
            if isinstance(n, (ast.Assign,)):
                tgts = n.targets
            elif isinstance(n, (ast.AugAssign, ast.AnnAssign)):
                tgts = [n.target]
            else:
                tgts = []
            for t in tgts:
                if isinstance(t, (ast.Attribute, ast.Subscript)) and isinstance(t.value, ast.Name) and t.value.id in params and t.value.id != 'self':
                    v(t, 'param-mutation', f'changes the parameter {t.value.id} in place: return a new value instead')
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and isinstance(n.func.value, ast.Name) \
                    and n.func.value.id in params and n.func.value.id != 'self' and n.func.attr in MUTATORS:
                v(n, 'param-mutation', f'{n.func.attr} changes the parameter {n.func.value.id} in place: return a new value instead')
    return out


def lint_file(path):
    """Every finding: the syntactic rules, then what the translator cannot read, unit by unit."""
    found = lint_rules(path)
    if found:
        return found
    import translate as T
    mod = Module(path)
    for u in mod.units():
        tr = T.Translator(path, '', (), [u.name])
        try:
            tr.translate_all()
        except T.Unsupported as e:
            f = e.where(path)
            if f not in found:
                found.append(f)
    return found


def main(argv):
    as_json = '--json' in argv
    files = [a for a in argv if not a.startswith('--')]
    if len(files) != 1:
        print('usage: lint.py <file.py> [--json]', file=sys.stderr)
        return 2
    path = files[0]
    found = lint_file(path)
    if as_json:
        rows = []
        for f in found:
            loc, rule, msg = f.split('  ', 2)
            _, line, col = loc.rsplit(':', 2)
            rows.append({'file': path, 'line': int(line), 'col': int(col), 'rule': rule, 'message': msg})
        print(json.dumps({'inside': not found, 'findings': rows}, indent=1))
    else:
        if found:
            print('\n'.join(found))
        else:
            print(f'{path}: inside the subset')
    return 1 if found else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
