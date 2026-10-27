"""The theorem generator of the gate.

    python3 -I spec/theorem.py --parent p.dfy --candidate c.dfy \
        --scope scope.json --edit edit.json --out obligations.dfy

Everything in the theorem comes from the parent file, the scope file and the
edit file. The candidate file is only the thing the theorem is about: the
generator reads its function signatures to refuse a mismatch, and never takes a
statement from it. See spec/README.md for the exact theorem shape.
"""
import argparse, json, re, sys

FORBIDDEN = [
    (r'\bassume\b', 'assume'),
    (r'\{\s*:\s*axiom\b', '{:axiom}'),
    (r'\{\s*:\s*verify\s+false', '{:verify false}'),
    (r'\{\s*:\s*extern\b', '{:extern}'),
    (r'\bexterns?\b', 'extern'),
]
IDENT = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')


class Refusal(Exception):
    pass


def strip_comments(text):
    text = re.sub(r'/\*.*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), text, flags=re.S)
    return re.sub(r'//[^\n]*', lambda m: ' ' * len(m.group(0)), text)


def balanced(text, start):
    """text[start] == '('; return index after the matching ')'."""
    depth = 0
    for i in range(start, len(text)):
        if text[i] == '(':
            depth += 1
        elif text[i] == ')':
            depth -= 1
            if depth == 0:
                return i + 1
    raise Refusal('unbalanced parenthesis in a function signature')


def split_top(s):
    out, depth, cur = [], 0, ''
    for ch in s:
        if ch in '(<[{':
            depth += 1
        elif ch in ')>]}':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur)
            cur = ''
        else:
            cur += ch
    if cur.strip():
        out.append(cur)
    return [p.strip() for p in out]


def parse_functions(text, suffix, label):
    """Return {base_name: {'params': [(name, type)], 'ret': type}} for every
    function named <base>_<suffix>. Refuses a function without a body."""
    clean = strip_comments(text)
    found = {}
    for m in re.finditer(r'\bfunction\s+(?:method\s+)?(?:\{[^}]*\}\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*(<[^>]*>)?\s*\(', clean):
        name = m.group(1)
        if suffix is None:
            base = name
        elif not name.endswith('_' + suffix):
            raise Refusal(f'{label}: function {name} does not end in _{suffix}')
        else:
            base = name[: -len(suffix) - 1]
        if not IDENT.match(base):
            raise Refusal(f'{label}: bad function name {name}')
        tparams = m.group(2).strip() if m.group(2) else ''  # `<T(==)>`: the lemma takes the same type parameters
        open_i = m.end() - 1
        close_i = balanced(clean, open_i)
        params = []
        for p in split_top(clean[open_i + 1: close_i - 1]):
            if ':' not in p:
                raise Refusal(f'{label}: parameter "{p}" of {name} has no type')
            pn, pt = p.split(':', 1)
            params.append((pn.strip(), re.sub(r'\s+', ' ', pt.strip())))
        rest = clean[close_i:]
        rm = re.match(r'\s*:\s*([^\n{]*?)\s*(?=\n|\{|requires\b|ensures\b|decreases\b|reads\b|$)', rest)
        if not rm or not rm.group(1):
            raise Refusal(f'{label}: function {name} has no return type')
        ret = re.sub(r'\s+', ' ', rm.group(1))
        # the body: a "{" before the next top-level declaration keyword
        tail = rest[rm.end():]
        nxt = re.search(r'\n\s*(function|lemma|method|predicate|datatype|type|const|ghost|module|include)\b', tail)
        region = tail[: nxt.start()] if nxt else tail
        region = re.sub(r'\{\s*:[^}]*\}', '', region)
        if '{' not in region:
            raise Refusal(f'{label}: function {name} has no body (an unproved specification is not code)')
        if base in found:
            raise Refusal(f'{label}: function {name} is defined twice')
        found[base] = {'params': params, 'ret': ret, 'pos': m.start(), 'tparams': tparams}
    order = sorted(found, key=lambda b: found[b]['pos'])
    for i, b in enumerate(order):
        end = found[order[i + 1]]['pos'] if i + 1 < len(order) else len(clean)
        found[b]['body'] = clean[found[b]['pos']:end]
    return found


def split_helpers(funcs_defined, scoped, suffix, label):
    """Functions named <scoped>_<x>_<suffix> are private helpers. Return the
    helper names; refuse a helper that no scoped function reaches."""
    helpers = [b for b in funcs_defined if b not in scoped and any(b.startswith(f + '_') for f in scoped)]
    reached, todo = set(), list(scoped)
    while todo:
        cur = todo.pop()
        body = funcs_defined[cur]['body']
        for h in helpers:
            if h not in reached and re.search(r'\b' + re.escape(h + '_' + suffix) + r'\b', body):
                reached.add(h)
                todo.append(h)
    lost = sorted(set(helpers) - reached)
    if lost:
        raise Refusal(f'{label}: helper {", ".join(lost)} is not called by any scoped function (a smuggled entry point)')
    return helpers


def sig_difference(parent_sig, cand_sig):
    """What differs between two `// SIG` lines, in the words a caller would use, or None when a caller sees the same
    signature. The parameter names are not compared. A line that is not JSON is compared as text."""
    try:
        p, c = json.loads(parent_sig), json.loads(cand_sig)
    except ValueError:
        return None if parent_sig == cand_sig else f'parent {parent_sig[:300]} vs candidate {cand_sig[:300]}'
    if not isinstance(p, dict) or not isinstance(c, dict):
        return None if p == c else f'parent {parent_sig[:300]} vs candidate {cand_sig[:300]}'
    show = lambda x: ('yes' if x else 'no') if isinstance(x, bool) else 'none' if x is None or x == [] else ', '.join(x) if isinstance(x, list) else str(x)
    out = []
    if p.get('decorators') != c.get('decorators'):
        out.append(f"method decorators {show(p.get('decorators'))} became {show(c.get('decorators'))}")
    if p.get('this') != c.get('this') or ('this' in p) != ('this' in c):
        out.append(f"this type {show(p.get('this'))} became {show(c.get('this'))}")
    pp, cp = p.get('params') or [], c.get('params') or []
    if len(pp) != len(cp):
        out.append(f'parameter count {len(pp)} became {len(cp)}')
    for k, (a, b) in enumerate(zip(pp, cp), 1):
        for key, word in (('type', 'type'), ('decorators', 'decorators'), ('optional', 'optional'), ('rest', 'rest'), ('init', 'default')):
            if a.get(key) != b.get(key):
                out.append(f'parameter {k} {word} {show(a.get(key))} became {show(b.get(key))}')
    if p.get('ret') != c.get('ret'):
        out.append(f"return type {show(p.get('ret'))} became {show(c.get('ret'))}")
    known = {'decorators', 'this', 'params', 'ret', 'names'}
    for key in sorted((set(p) | set(c)) - known):
        if p.get(key) != c.get(key):
            out.append(f'{key} {p.get(key)} became {c.get(key)}')
    return '; '.join(out) or None


def check_forbidden(text, label):
    clean = strip_comments(text)
    for pat, name in FORBIDDEN:
        if re.search(pat, clean):
            raise Refusal(f'{label}: contains {name}, which can make a proof vacuous')


def lemma_names(skeleton_text):
    return re.findall(r'^lemma\s+(?:\{[^}]*\}\s+)*([A-Za-z0-9_]+)', skeleton_text, flags=re.M)


ADAPTER_DOOR = 'no adapter declared: declare one in the scope file ("adapters": {"<f>": {"from": [...], "to": [...], "map": [...]}}) or as a // lean-adapter comment on the candidate function'
ADAPTED_PART = re.compile(r'^parameter (count \d+ became|\d+ (type|optional|rest|default) )')


def _subst(text, by):
    """`text` with every free identifier named in `by` replaced (a name after a dot is a field, a name before `:=` a
    binding: both stay as written)."""
    if not by:
        return text
    pat = re.compile(r"(?<![.\w'?])(" + '|'.join(re.escape(n) for n in sorted(by, key=len, reverse=True)) + r")(?![\w'?])(?!\s*:=)")
    return pat.sub(lambda m: by[m.group(1)], text)


def read_adapters(scope, funcs, pf, cf):
    """The scope's adapters: {f: {"from": parent parameter names, "to": candidate parameter names, "map": one Dafny
    expression over the parent's parameters per name in "to"}}. A parameter named in neither list is threaded: the
    same name and type on both sides (the world, the fuel, the receiver), passed as it is. Returns {f: {"to": {name:
    expr}, "show": text, "door": "scope"|"comment"}}."""
    raw = scope.get('adapters') or {}
    if not isinstance(raw, dict):
        raise Refusal('scope: "adapters" must be an object')
    out = {}
    for f, ad in raw.items():
        if f not in funcs:
            raise Refusal(f'scope: an adapter for {f}, which the scope does not list')
        if not isinstance(ad, dict) or not isinstance(ad.get('from'), list) or not isinstance(ad.get('to'), list):
            raise Refusal(f'scope: the adapter for {f} needs "from" and "to" lists of parameter names')
        mp = ad.get('map')
        mp = [mp] if isinstance(mp, str) else mp
        if not isinstance(mp, list) or len(mp) != len(ad['to']) or not all(isinstance(x, str) and x.strip() for x in mp):
            raise Refusal(f'scope: the adapter for {f} needs "map": one Dafny expression per name in "to"')
        pn, cn = [n for n, _ in pf[f]['params']], [n for n, _ in cf[f]['params']]
        pt, ct = dict(pf[f]['params']), dict(cf[f]['params'])
        if sorted(ad['from']) != sorted(set(ad['from'])) or not set(ad['from']) <= set(pn):
            raise Refusal(f'scope: the adapter for {f} names in "from" a parameter the parent does not have (parent: {", ".join(pn)})')
        if sorted(ad['to']) != sorted(set(ad['to'])) or not set(ad['to']) <= set(cn):
            raise Refusal(f'scope: the adapter for {f} names in "to" a parameter the candidate does not have (candidate: {", ".join(cn)})')
        for n in cn:
            if n not in ad['to'] and (n not in pt or n in ad['from'] or pt[n] != ct[n]):
                raise Refusal(f'scope: the adapter for {f} gives no value to the candidate parameter {n}')
        for n in pn:
            if n not in ad['from'] and (n not in ct or ct[n] != pt[n]):
                raise Refusal(f'scope: the adapter for {f} does not account for the parent parameter {n}')
        for x in mp:
            check_forbidden(x, f'adapter for {f}')
            if re.search(r'_(parent|candidate)\s*\(|[;{}]|\b(lemma|function|method|var)\b', strip_comments(x)):
                raise Refusal(f'scope: the adapter for {f} maps with "{x[:80]}", which is not one expression over the parameters')
        to = dict(zip(ad['to'], [x.strip() for x in mp]))
        out[f] = {'to': to, 'door': ad.get('door', 'scope') if ad.get('door') in ('scope', 'comment') else 'scope',
                  'show': f'{f}_candidate({", ".join(to.get(n, n) for n in cn)}) == {f}_parent({", ".join(pn)})'}
    return out


def adapted_args(f, names, adapters, cf):
    """The candidate's arguments for the parent's parameter `names`: by position, or through the adapter."""
    if f not in adapters:
        return ', '.join(names)
    return ', '.join(adapters[f]['to'].get(n, n) for n, _ in cf[f]['params'])


def _owner(base, funcs):
    return next((f for f in sorted(funcs, key=len, reverse=True) if base == f or base.startswith(f + '_')), None)


def _calls(parsed, funcs, suffix):
    """{f: the scoped functions f calls, from f's own body and its helpers' (<f>_<x>)}."""
    out = {f: set() for f in funcs}
    for base, fn in parsed.items():
        own = _owner(base, funcs)
        if own is None:
            continue
        out[own] |= {x for x in re.findall(r'\b([A-Za-z_][A-Za-z0-9_]*)_' + suffix + r'\s*\(', strip_comments(fn['body'])) if x in funcs}
    return out


def summaries_of(funcs, pf, cf, aliased, unguarded, hyps, adapters):
    """The relational summaries each Equal_<f> rests on. For a scoped callee g that both sides of f call, changed (not
    aliased) and with its own lemma, the proof of Equal_<f> first states R_g for every input outside g's scope by
    calling Equal_<g> (a lemma call, never an assumption): at aligned call sites the prover uses R_g instead of the two
    bodies. A callee on f's own recursive cycle is the induction premise: the call is admitted only on a smaller fuel,
    and Equal_<f> decreases its fuel. A cycle without a fuel parameter gets no premise (its measure is not read).
    Heap-core units (a hypothesis) and generic callees keep the bodies. Returns {f: {rests, lines, induction}}."""
    cp, cc = _calls(pf, funcs, 'parent'), _calls(cf, funcs, 'candidate')
    graph = {f: cp[f] | cc[f] for f in funcs}

    def reach(a):
        seen, todo = set(), [a]
        while todo:
            for y in graph[todo.pop()]:
                if y not in seen:
                    seen.add(y); todo.append(y)
        return seen
    reaches = {f: reach(f) for f in funcs}
    has_lemma = lambda g: g not in aliased and g not in unguarded and g not in hyps and not pf[g].get('tparams')
    fuel_of = lambda g: pf[g]['params'][0][0] if pf[g]['params'] and pf[g]['params'][0][1] == 'nat' and pf[g]['params'][0][0] == 'fuel' and cf[g]['params'] and cf[g]['params'][0] == pf[g]['params'][0] else None
    out = {}
    for f in funcs:
        if not has_lemma(f):
            continue
        rests, lines, cycle = [], [], []
        for g in sorted(cp[f] & cc[f]):
            if not has_lemma(g):
                continue
            on_cycle = f in reaches[g]
            if on_cycle and not (fuel_of(f) and fuel_of(g)):
                continue
            gp = pf[g]['params']
            taken = {n for n, _ in pf[f]['params']} | {n for n, _ in gp}
            bound = []
            for i, (n, t) in enumerate(gp):
                b = f'r{i}_{g}'
                while b in taken:
                    b += '_'
                bound.append((b, t))
            by = {n: b for (n, _), (b, _) in zip(gp, bound)}
            names = ', '.join(b for b, _ in bound)
            guard = f'!InScope_{g}({names})' + (f' && {bound[0][0]} < {fuel_of(f)}' if on_cycle else '')
            cargs = _subst(adapted_args(g, [n for n, _ in gp], adapters, cf), by)
            lines.append(f'forall {", ".join(f"{b}: {t}" for b, t in bound)} | {guard}')
            lines.append(f'  ensures {g}_parent({names}) == {g}_candidate({cargs})')
            lines.append(f'{{ Equal_{g}({names}); }}')
            rests.append(g)
            if on_cycle:
                cycle.append(g)
        if rests:
            out[f] = {'rests': rests, 'lines': lines,
                      'induction': {'measure': fuel_of(f), 'component': sorted(set(cycle) | {f})} if cycle else None}
    return out


COLLECTION_TYPE = re.compile(r'^(?:string|(?:seq|set|iset|multiset|map|imap)\s*<.*>)$')


def _tuple_parts(t):
    """The component types of a Dafny tuple type `(A, B, ...)`, or None when `t` is not a tuple of two or more."""
    t = t.strip()
    if not (t.startswith('(') and t.endswith(')')) or balanced(t, 0) != len(t):
        return None
    parts = split_top(t[1:-1].replace('->', '\x00'))
    return [p.replace('\x00', '->') for p in parts] if len(parts) > 1 else None


def component_hints(ret, lhs, rhs):
    """The proof hint for an equality between two tuples: a collection compared inside a tuple is not compared by its
    elements (tuple equality is equality of the components, and Dafny reaches a sequence's extensionality only from an
    equality goal of that sequence's own type, so two `Map(s, f)` with pointwise-equal callbacks prove alone and not as a
    component). For a goal `lhs == rhs` whose type is a tuple, one assert per component whose type is a collection
    (seq, string, set, iset, multiset, map, imap), nested tuples walked: each is the same equality on a projection, a
    consequence of the goal, so it can only help the prover reach it, never prove more."""
    out = []

    def walk(t, path):
        parts = _tuple_parts(t)
        if parts is None:
            if path and COLLECTION_TYPE.match(t.strip()):
                out.append(f'assert {lhs}{path} == {rhs}{path};')
            return
        for i, p in enumerate(parts):
            walk(p, f'{path}.{i}')
    walk(ret, '')
    return out


def generate(parent_text, cand_text, scope, edit, prelude_text=None, prelude_name=None):
    check_forbidden(parent_text, 'parent')
    check_forbidden(cand_text, 'candidate')
    pf = parse_functions(parent_text, 'parent', 'parent')
    cf = parse_functions(cand_text, 'candidate', 'candidate')
    funcs = scope.get('functions')
    if not isinstance(funcs, dict) or not funcs:
        raise Refusal('scope: "functions" must be a non-empty object')
    for f in funcs:
        if f not in pf:
            raise Refusal(f'scope lists {f}, which the parent does not define')
        if f not in cf:
            raise Refusal(f'scope lists {f}, which the candidate does not define')
    hp = split_helpers(pf, list(funcs), 'parent', 'parent')
    hc = split_helpers(cf, list(funcs), 'candidate', 'candidate')
    unscoped = sorted(set(cf) - set(funcs) - set(hc))
    if unscoped:
        raise Refusal('candidate defines functions that the scope does not list: ' + ', '.join(unscoped))
    slot_layout_differs = set()
    # an adapter (scope "adapters"): the developer's declared mapping from the parent's parameters to the candidate's,
    # for a function whose signature changed; the theorem then states f_candidate(A(x)) == f_parent(x)
    adapters = read_adapters(scope, funcs, pf, cf)
    dafny_sig_withheld = {}
    for f in funcs:
        if f not in pf:
            raise Refusal(f'scope lists {f}, which the parent does not define')
        if f not in cf:
            raise Refusal(f'scope lists {f}, which the candidate does not define')
        # the parameter types by position and the return type: the lemma binds the parent's names and passes them to the
        # candidate by position, so a renamed Dafny parameter is the same signature
        if ([t for _, t in pf[f]['params']], pf[f]['ret']) != ([t for _, t in cf[f]['params']], cf[f]['ret']):
            if 'Slots_' in str(pf[f]['params']) + str(cf[f]['params']) + str(pf[f]['ret']) + str(cf[f]['ret']):
                slot_layout_differs.add(f)  # a component whose hook slots changed: nothing to compare slot by slot; its lemma is withheld
                continue
            if f in adapters:  # the adapter states the relation between the two parameter lists; the result types must agree
                if pf[f]['ret'] != cf[f]['ret']:
                    dafny_sig_withheld[f] = f"interface differs: return type {pf[f]['ret']} became {cf[f]['ret']}; an adapter maps the parameters only"
                continue
            pt, ct = [t for _, t in pf[f]['params']], [t for _, t in cf[f]['params']]
            what = [f'parameter count {len(pt)} became {len(ct)}'] if len(pt) != len(ct) else []
            what += [f'parameter {k} type {a} became {b}' for k, (a, b) in enumerate(zip(pt, ct), 1) if a != b]
            what += [f"return type {pf[f]['ret']} became {cf[f]['ret']}"] if pf[f]['ret'] != cf[f]['ret'] else []
            # a changed signature without an adapter: no lemma for this function (the two sides take different inputs),
            # the rest of the file keeps its theorem
            dafny_sig_withheld[f] = 'interface differs: Dafny ' + '; '.join(what) + '; ' + ADAPTER_DOOR
    extra_edits = sorted(set(edit) - set(funcs))
    if extra_edits:
        raise Refusal('edit lists functions that the scope does not: ' + ', '.join(extra_edits))
    # Equal by identity: a candidate function whose text equals the parent's (suffixes stripped) defines the same
    # function. Its body becomes a call of the parent's, so the prover sees the equality without induction. The
    # comparison is on the full declaration text with comments removed and whitespace folded; any difference keeps
    # the candidate's own body.
    # the TypeScript signature a caller sees (`// SIG <name>: <json>`: decorators, the `this` type, per position the
    # parameter's decorators, type, optionality, rest-ness and default, the return type). Two Dafny signatures can agree
    # while the TypeScript ones differ (an absence read as one None, a changed parameter decorator the framework runs
    # before the call): a differing signature withholds the lemma as an interface change, never a proof. The parameter
    # names (`names`) are not compared: a caller passes arguments by position, so a rename alone is not a change.
    sigs = {}
    for label, text, suffix in (('parent', parent_text, '_parent'), ('candidate', cand_text, '_candidate')):
        for m in re.finditer(r'^// SIG ([A-Za-z_][A-Za-z0-9_]*): (.+)$', text, flags=re.M):
            name = m.group(1)
            if not name.endswith(suffix):
                raise Refusal(f'{label}: signature for {name} does not end in {suffix}')
            sigs.setdefault(name[: -len(suffix)], {})[label] = m.group(2).strip()
    sig_diff = {f: sig_difference(s_['parent'], s_['candidate']) for f, s_ in sigs.items() if 'parent' in s_ and 'candidate' in s_}
    sig_differs = {f for f, d in sig_diff.items() if d}
    cand_text, aliased = alias_identical(parent_text, cand_text, pf, cf, sig_differs | set(adapters) | set(dafny_sig_withheld))
    # a heap-core unit carries the hypothesis its inputs satisfy in the typed program (`// HYP <name>: <expr>`, written
    # by the translator); the lemma assumes it. Both sides must state the same hypothesis, or there is no one theorem.
    hyps = {}
    for label, text, suffix in (('parent', parent_text, '_parent'), ('candidate', cand_text, '_candidate')):
        for m in re.finditer(r'^// HYP ([A-Za-z_][A-Za-z0-9_]*): (.+)$', text, flags=re.M):
            name = m.group(1)
            if not name.endswith(suffix):
                raise Refusal(f'{label}: hypothesis for {name} does not end in {suffix}')
            hyps.setdefault(name[: -len(suffix)], {})[label] = re.sub(r'\s+', ' ', m.group(2).strip())
    # a heap-core unit that accesses an element (itself or through a callee) carries `// INRANGE <name>`: an access out of
    # range sets the world's oob flag, where JavaScript reads undefined or writes a property; the unit's answer is not
    # modelled from there, so its lemmas also require that neither side ever sets the flag
    inrange = set()
    for label, text, suffix in (('parent', parent_text, '_parent'), ('candidate', cand_text, '_candidate')):
        for m in re.finditer(r'^// INRANGE ([A-Za-z_][A-Za-z0-9_]*)$', text, flags=re.M):
            name = m.group(1)
            if not name.endswith(suffix):
                raise Refusal(f'{label}: in-range mark for {name} does not end in {suffix}')
            inrange.add(name[: -len(suffix)])
    for f, h in hyps.items():  # compared with the parameters by position: the lemma states the parent's, over the parent's names
        if f in adapters and h.get('parent') is not None and h.get('candidate') is not None:
            continue  # an adapted heap-core unit: the lemma assumes the parent's hypothesis over the parent's inputs; the candidate runs on A(x)
        if f in funcs and (h.get('parent') is None or h.get('candidate') is None or not equal_by_position(h['parent'], h['candidate'], pf[f]['params'], cf[f]['params'])):
            raise Refusal(f'{f}: hypothesis differs between parent and candidate')
    # the identity guard (references, layer 1): a unit read as a value tree carries `// GUARD <name>: {exposed, determinate,
    # sites, writes}`. Tree equality implies graph equality only when the unit is not exposed, or when both sides have one
    # readable identity shape and the shapes agree. Otherwise the Equal lemma is withheld: the proof lane says nothing and
    # the bounded run decides (ASK:identity). A candidate identical to the parent by text is the same function and keeps
    # its lemma whatever its shape.
    guards = {}
    for label, text, suffix in (('parent', parent_text, '_parent'), ('candidate', cand_text, '_candidate')):
        for m in re.finditer(r'^// GUARD ([A-Za-z_][A-Za-z0-9_]*): (.+)$', text, flags=re.M):
            name = m.group(1)
            if not name.endswith(suffix):
                raise Refusal(f'{label}: guard for {name} does not end in {suffix}')
            try:
                guards.setdefault(name[: -len(suffix)], {})[label] = json.loads(m.group(2))
            except ValueError:
                raise Refusal(f'{label}: guard for {name} is not JSON')
    unguarded = {f: 'slot layout differs: the hook slots of parent and candidate are not the same list' for f in slot_layout_differs}
    unguarded.update(dafny_sig_withheld)
    for f, s in sigs.items():
        if f in funcs and f not in aliased and f not in dafny_sig_withheld and sig_diff.get(f):
            if f in adapters:  # the adapter accounts for the parameters; a changed decorator, receiver or return type it does not
                rest = [x for x in sig_diff[f].split('; ') if not ADAPTED_PART.match(x)]
                if rest:
                    unguarded[f] = f"interface differs: {'; '.join(rest)[:300]}; an adapter maps the parameters only"
                continue
            door = ADAPTER_DOOR if all(ADAPTED_PART.match(x) for x in sig_diff[f].split('; ')) else 'an adapter maps the parameters only, so no adapter states this change'
            unguarded[f] = f"interface differs: {sig_diff[f][:300]}; {door}"
    # an adapter on a heap-core unit is read through the core's own encoding: the heap world is threaded (the same name
    # and type on both sides), the lemma assumes the parent's hypothesis, and the map is over the core's value types
    # (number | null is the core's Option, so Some(x)). A candidate parameter that is a heap reference is a cell the core
    # allocates; an expression over values cannot make one, so that shape is refused by name unless the map passes a
    # parent reference of the same type through
    for f in adapters:
        if f in hyps and f not in unguarded:
            pt_, ct_ = dict(pf[f]['params']), dict(cf[f]['params'])
            for n, expr in adapters[f]['to'].items():
                if re.search(r'\b(Ref|HWorld)\b', ct_[n]) and not (expr in pt_ and pt_[expr] == ct_[n]):
                    unguarded[f] = f"interface differs: the adapter for {f} maps {expr[:60]} to the candidate's {n}: {ct_[n]}, a reference the heap core allocates; an adapter is an expression over values, so the core does not read this shape"
                    break
    for f, g in guards.items():
        if f not in funcs or f in aliased or 'parent' not in g or 'candidate' not in g:
            continue
        gp, gc = g['parent'], g['candidate']
        if not gp.get('exposed') and not gc.get('exposed'):
            continue
        aliasable = gp.get('aliasable') or gc.get('aliasable')
        if aliasable:  # two input positions of one shape may be one object, and the unit writes through one: the value reading says nothing
            unguarded[f] = 'aliasable input: ' + aliasable[:220]
            continue
        if not (gp.get('determinate') and gc.get('determinate')):
            unguarded[f] = 'identity shape unreadable on ' + ', '.join(s for s in ('parent', 'candidate') if not g[s].get('determinate')) + '; exposed by: ' + '; '.join(sorted(set(gp.get('exposed', []) + gc.get('exposed', []))))
        elif gp.get('sites') != gc.get('sites') or gp.get('writes') != gc.get('writes'):
            unguarded[f] = f"identity shapes differ: parent {gp.get('sites')} {gp.get('writes')} vs candidate {gc.get('sites')} {gc.get('writes')}"
    # a function value is Fn(code, env): every Fn literal a unit emits must carry a code id the unit's own `// FN` header
    # lists (the file's closures); a body outside the file's list is refused, never proved
    for label, text, suffix, parsed in (('parent', parent_text, '_parent', pf), ('candidate', cand_text, '_candidate', cf)):
        listed = {}
        for m in re.finditer(r'^// FN ([A-Za-z_][A-Za-z0-9_]*): (.+)$', text, flags=re.M):
            try:
                listed[m.group(1)] = set(json.loads(m.group(2)))
            except ValueError:
                raise Refusal(f'{label}: FN list for {m.group(1)} is not JSON')
        for base, fn in parsed.items():
            codes = set(re.findall(r'\bFn\("([0-9a-f]+)"', fn.get('body', '')))
            if not codes:
                continue
            owner = next((f for f in sorted(funcs, key=len, reverse=True) if base == f or base.startswith(f + '_')), base)  # a loop or branch helper (<unit>_<x>) carries its unit's list
            allowed = listed.get(owner + suffix, set())
            outside = sorted(codes - allowed)
            if outside:
                raise Refusal(f'{label}: {base} holds a function value whose body is outside the file\'s list ({outside[0][:24]}...)')
    # an opaque block names the same-file functions it calls; if one of them is not identical on both sides the block's
    # transition is not the same transition, and the theorem cannot stand
    for m in re.finditer(r'// CALLS: ([A-Za-z0-9_,]+)', prelude_text or ''):
        for c in m.group(1).split(','):
            if c and c in cf and c not in aliased:
                raise Refusal(f'an opaque block calls {c}, which differs between parent and candidate')

    # the canonical-heap certificate (translator prelude: `// CANON fuel=<recursive functions>`): for a heap-core unit
    # that is neither aliased nor withheld, five part lemmas beside Equal_<f>, together the predicate CanonEqual: the
    # initial cells agree (literally or after renaming), the named fresh cells agree, the roots' names agree, no fresh
    # reference is unnamed, and a primitive result agrees. Every body is empty: the parts are what the prover must show;
    # check.mjs reads the unit as proved when Equal_<f> holds or every EqualCanon_<f>_* part holds.
    summaries = summaries_of(funcs, pf, cf, aliased, unguarded, hyps, adapters) if scope.get('summaries') is True else {}
    canon_fuel = None
    if prelude_text:
        mm = re.search(r'^// CANON fuel=([A-Za-z0-9_,]+)$', prelude_text, flags=re.M)
        if mm:
            canon_fuel = [x for x in mm.group(1).split(',') if x]
    out = []
    out.append('// Generated by spec/theorem.py. Everything between BEGIN THEOREM and END THEOREM')
    out.append('// comes from the parent, the scope and the edit. Only lemma bodies are free.')
    if prelude_text is not None:
        out.append('// BEGIN PRELUDE (shared declarations; the translator wrote them, identical on both sides)')
        out.append(prelude_text.rstrip('\n'))
        out.append('// END PRELUDE')
    out.append('// BEGIN PARENT')
    out.append(parent_text.rstrip('\n'))
    out.append('// END PARENT')
    out.append('// BEGIN CANDIDATE')
    out.append(cand_text.rstrip('\n'))
    out.append('// END CANDIDATE')
    out.append('// BEGIN THEOREM')
    for f, spec in funcs.items():
        sig = pf[f]
        params = ', '.join(f'{n}: {t}' for n, t in sig['params'])
        names = ', '.join(n for n, _ in sig['params'])
        ins = spec.get('in_scope')
        if not isinstance(ins, str) or not ins.strip():
            raise Refusal(f'scope: {f} needs "in_scope" (a Dafny boolean expression, or false)')
        ed = edit.get(f)
        tp = sig.get('tparams', '')
        out.append(f'predicate InScope_{f}{tp}({params}) {{ {ins.strip()} }}')
        if f in unguarded:
            out.append(f'// UNGUARDED Equal_{f}: {unguarded[f]}')
            if ins.strip() == 'false' or f in dafny_sig_withheld:
                continue
        if f in adapters and ins.strip() != 'false':
            raise Refusal(f'scope: the adapter for {f} needs "in_scope": "false" (an adapted function is compared whole)')
        sm = summaries.get(f, {})
        if f in adapters:
            out.append(f'// ADAPTER Equal_{f}: {adapters[f]["show"]} (door {adapters[f]["door"]})')
        if sm.get('rests'):
            out.append(f'// RESTS Equal_{f}: ' + ','.join('Equal_' + g for g in sm['rests']))
        if sm.get('induction'):
            ind = sm['induction']
            out.append(f'// INDUCTION Equal_{f}: decreases {ind["measure"]} over {",".join(ind["component"])}; termination: each side\'s own definition decreases its fuel, and running out is the same uninterpreted value on both sides, so equality includes running out at the same depth')
        out.append(f'lemma Equal_{f}{tp}({params})')
        out.append(f'  requires !InScope_{f}({names})')
        if f in hyps:
            out.append(f'  requires {hyps[f]["parent"]}')
        adapted = adapted_args(f, [n for n, _ in sig["params"]], adapters, cf)
        if f in inrange and f in hyps and f not in aliased:
            out.append(f'  ensures !{f}_parent({names}).0.oob && !{f}_candidate({adapted}).0.oob')
        out.append(f'  ensures {f}_parent({names}) == {f}_candidate({adapted})')
        if sm.get('induction'):
            out.append(f'  decreases {sm["induction"]["measure"]}')
        hints = component_hints(sig['ret'], f'{f}_parent({names})', f'{f}_candidate({adapted})')  # a tuple's collections compared first
        out.append('{ // PROOF Equal_' + f)
        out.extend('  ' + ln for ln in sm.get('lines', []))
        out.extend('  ' + ln for ln in hints)
        out.append('} // END Equal_' + f)
        if sm.get('rests'):  # the same statement proved from the bodies alone: a function the bodies prove needs no summary
            out.append(f'lemma EqualDirect_{f}{tp}({params})')
            out.append(f'  requires !InScope_{f}({names})')
            out.append(f'  ensures {f}_parent({names}) == {f}_candidate({adapted_args(f, [n for n, _ in sig["params"]], adapters, cf)})')
            out.append('{ // PROOF EqualDirect_' + f)
            out.extend('  ' + ln for ln in hints)
            out.append('} // END EqualDirect_' + f)
        if canon_fuel and f in hyps and f not in aliased and f not in unguarded and f not in adapters and sig['params'] and sig['params'][0][1] == 'HWorld' and sig['ret'].replace(' ', '').startswith('(HWorld,'):
            hw = sig['params'][0][0]
            refs = [n for n, t in sig['params'][1:] if t == 'Ref']
            ret_ref = sig['ret'].replace(' ', '') == '(HWorld,Ref)'
            rp = ', '.join(refs + ([f'{f}_parent({names}).1'] if ret_ref else []))
            rc = ', '.join(refs + ([f'{f}_candidate({names}).1'] if ret_ref else []))
            hp, hc = f'{f}_parent({names}).0', f'{f}_candidate({names}).0'
            n0 = f'{hw}.next'
            fuel = ' '.join(f'{{:fuel {x},20,21}}' for x in canon_fuel)
            parts = {
                'initial': f'CanonInitial({n0}, {hp}, CanonOrderOf({hp}, {n0}, [{rp}]), {hc}, CanonOrderOf({hc}, {n0}, [{rc}]))',
                'cells': f'CanonCells({hp}, {n0}, CanonOrderOf({hp}, {n0}, [{rp}]), 0) == CanonCells({hc}, {n0}, CanonOrderOf({hc}, {n0}, [{rc}]), 0)',
                'roots': f'CanonNames({n0}, CanonOrderOf({hp}, {n0}, [{rp}]), [{rp}]) == CanonNames({n0}, CanonOrderOf({hc}, {n0}, [{rc}]), [{rc}])',
                'named': f'CanonNoUnnamed({hw}, {hp}, {n0}, CanonOrderOf({hp}, {n0}, [{rp}])) && CanonNoUnnamed({hw}, {hc}, {n0}, CanonOrderOf({hc}, {n0}, [{rc}]))',
            }
            if not ret_ref:
                parts['result'] = f'{f}_parent({names}).1 == {f}_candidate({names}).1'
            if f in inrange:
                parts['inrange'] = f'!{hp}.oob && !{hc}.oob'
            out.append(f'// CANONICAL EqualCanon_{f}: {len(parts)} parts, together CanonEqual({hw}, {n0}, {hp}, [{rp}], {hc}, [{rc}])' + ('' if ret_ref else ' and the primitive result'))
            for part, ens in parts.items():
                out.append(f'lemma {fuel} EqualCanon_{f}_{part}{tp}({params})')
                out.append(f'  requires !InScope_{f}({names})')
                out.append(f'  requires {hyps[f]["parent"]}')
                out.append(f'  ensures {ens}')
                out.append(f'{{ // PROOF EqualCanon_{f}_{part}')
                out.append(f'}} // END EqualCanon_{f}_{part}')
        if ins.strip() == 'false':
            if ed:
                raise Refusal(f'{f} is wholly outside S and cannot carry an edit')
            continue
        if not isinstance(ed, dict) or (('post' in ed) == ('pairs' in ed)):
            raise Refusal(f'edit: {f} is inside S and needs exactly one of "post" or "pairs"')
        if 'post' in ed:
            out.append(f'predicate Post_{f}({params}, result: {sig["ret"]}) {{ {ed["post"].strip()} }}')
            out.append(f'lemma Edit_{f}({params})')
            out.append(f'  requires InScope_{f}({names})')
            if f in hyps:
                out.append(f'  requires {hyps[f]["parent"]}')
            out.append(f'  ensures Post_{f}({names}, {f}_candidate({names}))')
            out.append('{ // PROOF Edit_' + f)
            out.append('} // END Edit_' + f)
        else:
            if not ed['pairs']:
                raise Refusal(f'edit: {f} has an empty "pairs" list')
            for i, pr in enumerate(ed['pairs'], 1):
                args = pr['args']
                if len(args) != len(sig['params']):
                    raise Refusal(f'edit: {f} pair {i} has {len(args)} args, the function takes {len(sig["params"])}')
                a = ', '.join(str(x) for x in args)
                out.append(f'lemma Edit_{f}_pair{i}()')
                out.append(f'  ensures InScope_{f}({a}) && {f}_candidate({a}) == {pr["result"]}')
                out.append(f'{{ // PROOF Edit_{f}_pair{i}')
                out.append(f'}} // END Edit_{f}_pair{i}')
    out.append('// END THEOREM')
    return '\n'.join(out) + '\n'


SUPPORT_RE = re.compile(r'// BEGIN SUPPORT\n.*?// END SUPPORT\n?', re.S)
INCLUDE_RE = re.compile(r'^include\s+"([^"]+)"\s*$', re.M)
PRELUDE_BLOCK = re.compile(r'// PRELUDE (\S+)\n(.*?)\n// END PRELUDE', re.S)


def merge_preludes(parent_path, cand_path, parent_text, cand_text):
    """Both translations may `include` a prelude of shared declarations (datatypes, helpers with bodies,
    bodiless externals). The theorem needs ONE prelude: every block named in both must be byte-identical,
    a block named in one only is kept. A prelude block may not define a scoped name (no _parent/_candidate),
    and the main files keep no include. Returns (parent_text, cand_text, merged_prelude_text or None)."""
    import os
    blocks, order = {}, []
    texts = []
    for label, path, text in (('parent', parent_path, parent_text), ('candidate', cand_path, cand_text)):
        incs = INCLUDE_RE.findall(text)
        if len(incs) > 1:
            raise Refusal(f'{label}: more than one include')
        if incs:
            ppath = os.path.join(os.path.dirname(os.path.abspath(path)), incs[0])
            if not os.path.exists(ppath):
                raise Refusal(f'{label}: included prelude {incs[0]} is missing')
            ptext = open(ppath).read()
            check_forbidden(ptext, label + ' prelude')
            if re.search(r'\b[A-Za-z_][A-Za-z0-9_]*_(parent|candidate)\s*\(', strip_comments(ptext)):
                raise Refusal(f'{label} prelude: declares a _parent/_candidate name (a scoped name outside the main file)')
            for name, body in PRELUDE_BLOCK.findall(ptext):
                if name in blocks and blocks[name] != body:
                    raise Refusal(f'prelude block {name} differs between parent and candidate (the shared vocabulary must be one)')
                if name not in blocks:
                    blocks[name] = body
                    order.append(name)
            text = INCLUDE_RE.sub('', text)
        texts.append(text)
    merged = None
    if order:
        merged = '// Merged prelude: shared declarations of parent and candidate (identical where both declare).\n' + \
                 '\n'.join(f'// PRELUDE {n}\n{blocks[n]}\n// END PRELUDE' for n in order) + '\n'
    return texts[0], texts[1], merged


def _strip_group_parens(t):
    """Remove a pair of parentheses that encloses one whole list element or call argument (`[(e)]`, `f((e), x)`,
    `((e))`): grouping that changes nothing, which one translation path writes and another does not. A group holding
    a top-level comma is a tuple and stays; a group followed by `(`, `.`, `[` or `=>` is an operand or a lambda and
    stays."""
    changed = True
    while changed:
        changed = False
        stack = []
        for i, ch in enumerate(t):
            if ch == '(':
                stack.append(i)
            elif ch == ')':
                if not stack:
                    continue
                o = stack.pop()
                before = t[:o].rstrip()
                after = t[i + 1:].lstrip()
                if not before or before[-1] not in '[,(' or not after or after[0] not in '],)':
                    continue
                inner = t[o + 1:i]
                depth = 0
                tuple_ = False
                for c in inner:
                    if c in '([{':
                        depth += 1
                    elif c in ')]}':
                        depth -= 1
                    elif c == ',' and depth == 0:
                        tuple_ = True
                        break
                if tuple_ or not inner.strip():
                    continue
                t = t[:o] + inner + t[i + 1:]
                changed = True
                break
    return t


def _norm(text, suffix):
    t = strip_comments(text)
    t = re.sub(r'_' + suffix + r'\b', '', t)
    return _strip_group_parens(re.sub(r'\s+', ' ', t).strip())


_IDENT = r"[A-Za-z_][A-Za-z0-9_]*"


def _enclosing_span(text, pos):
    """The span of the innermost balanced `(...)` or `{...}` holding `pos` (the whole text when none): a `var`'s scope
    cannot reach past it."""
    stack = []
    for i, ch in enumerate(text):
        if ch in '({':
            stack.append(i)
        elif ch in ')}':
            if not stack:
                continue
            o = stack.pop()
            if o <= pos < i:
                return o, i + 1
    return 0, len(text)


def _canon_locals(text):
    """The text with every name a `var` binds, when that binding is the name's first occurrence and every occurrence
    lies inside the binding's scope, renamed by the order of binding. Two texts equal after this are the same
    function up to the names of its own locals (a consistent renaming of bound names changes nothing). A name used
    before its binding (a parameter, an outer name) stays as written: parameters are compared by position, the rest as
    written. A name before `:=` outside a binder is a field and is never renamed."""
    i = 0
    n = 0
    out = text
    seen = set()
    while True:
        m = re.search(r"\bvar\s+", out[i:])
        if not m:
            break
        b0 = i + m.end()
        e = re.search(r":=", out[b0:])
        if not e:
            break
        b1 = b0 + e.start()
        binder = out[b0:b1]
        i = b1 + 2
        inner = binder.strip()
        parts = inner[1:inner.rfind(')')].split(',') if inner.startswith('(') else [inner]
        names = [q.split(':')[0].strip() for q in parts]
        names = [q for q in names if re.fullmatch(_IDENT, q) and q not in seen and not q.startswith('__lean_')]
        for name in names:
            seen.add(name)
            occ = re.compile(r"(?<![.\w'?])" + re.escape(name) + r"(?![\w'?])")
            first = occ.search(out)
            if first is None or not (b0 <= first.start() < b1):
                continue  # used before its binding: not this binder's own
            s0, s1 = _enclosing_span(out, b0)
            if any(not (s0 <= o.start() < s1) for o in occ.finditer(out)):
                continue  # an occurrence outside the scope: another name of the same spelling
            new = f'__lean_local_{n}__'
            n += 1
            # inside the binder every occurrence; elsewhere every occurrence not followed by `:=` (a field)
            head, tail = out[:b1], out[b1:]
            head = head[:b0] + occ.sub(new, head[b0:]) if False else head[:b0] + occ.sub(new, head[b0:b1])
            tail = re.sub(r"(?<![.\w'?])" + re.escape(name) + r"(?![\w'?])(?!\s*:=)", new, tail)
            delta = len(head) - b1
            out = head + tail
            i += delta
            b1 += delta
    return out


def _by_position(text, params):
    """The text with every parameter name replaced by its position. A name after a dot is a field, and a name before
    `:=` may be a field (`r.(n := v)`, `R(n := v)`) or a new binding: both stay as written, so a text that differs there
    stays different. Two texts equal this way say the same thing about the same arguments."""
    names = [n for n, _ in params]
    if not names or len(set(names)) != len(names) or '__lean_param_' in text:
        return text
    by = {n: f'__lean_param_{i}__' for i, n in enumerate(names)}
    pat = re.compile(r"(?<![.\w'?])(" + '|'.join(re.escape(n) for n in sorted(by, key=len, reverse=True)) + r")(?![\w'?])(?!\s*:=)")
    return pat.sub(lambda m: by[m.group(1)], text)


def _occurs(text, name):
    """Whether `name` occurs in `text` as an identifier other than a field read (a name after a dot)."""
    return re.search(r"(?<![.\w'?])" + re.escape(name) + r"(?![\w'?])", text) is not None


def _rebinds(text, name):
    """Whether `text` binds `name` again in a way `_by_position` cannot rename consistently: an untyped `var name :=`
    (the binder stays as written while its uses are renamed), a lambda parameter (`=>`), a type binder (`::`), a
    quantifier or a match pattern. A typed `var name: T :=` or a tuple binder `var (.., name, ..) :=` is renamed with
    its uses, so it does not count; a field `R(name := v)` is a field on both sides and never renamed."""
    n = re.escape(name)
    stop = r"(?:(?!:=|:\||::|=>)[^;{}])*?"  # a binder list ends where the bound expression or the body starts
    if re.search(r"(?<![.\w'?])" + n + r"(?![\w'?])\s*(?:=>|::)", text):
        return True
    if re.search(r"\bvar\s+" + n + r"(?![\w'?])\s*:=", text):
        return True
    return re.search(r"\b(?:forall|exists|case)\b" + stop + r"(?<![.\w'?])" + n + r"(?![\w'?])", text) is not None


def equal_by_position(ptext, ctext, pparams, cparams):
    """Two texts equal up to a renaming of the parameters by position. A renamed position is admitted only when the
    rename cannot capture: the candidate's new name does not occur in the parent text, the parent's old name does not
    occur in the candidate text, and neither side binds its name again. Otherwise the texts must agree as written."""
    pn, cn = [n for n, _ in pparams], [n for n, _ in cparams]
    if len(pn) != len(cn):
        return False
    if pn == cn:
        return ptext == ctext
    for o, n in zip(pn, cn):
        if o != n and (_occurs(ptext, n) or _occurs(ctext, o) or _rebinds(ptext, o) or _rebinds(ctext, n)):
            return False
    return _by_position(ptext, pparams) == _by_position(ctext, cparams)


def _body_span(clean, start):
    """From a function's start offset in `clean`: the offset of its body's opening brace and the one after its close."""
    i = clean.find('(', start)
    i = balanced(clean, i)  # after the parameter list
    depth = 0
    while i < len(clean):
        if clean[i] == '{':
            if clean[i + 1:i + 2] == ':':  # an attribute {:...}
                i = clean.find('}', i) + 1
                continue
            j = i; depth = 0
            while j < len(clean):
                if clean[j] == '{': depth += 1
                elif clean[j] == '}':
                    depth -= 1
                    if depth == 0:
                        return i, j + 1
                j += 1
            raise Refusal('unbalanced function body')
        i += 1
    raise Refusal('function without a body')


def alias_identical(parent_text, cand_text, pf, cf, exclude=frozenset()):
    """Rewrite each candidate function identical to the parent's (up to a renaming of its parameters) into
    `{ <base>_parent(<names>) }`, the candidate's own names passed by position."""
    aliased = []
    clean = strip_comments(cand_text)
    edits = []
    # identical text is not enough: a function that calls a changed function is changed through it. Keep only the
    # functions whose text is identical AND whose same-file callees are all identical (a fixpoint).
    same = {b for b in cf if b in pf and b not in exclude and equal_by_position(_canon_locals(_norm(pf[b]['body'], 'parent')), _canon_locals(_norm(cf[b]['body'], 'candidate')), pf[b]['params'], cf[b]['params'])} # a unit whose TypeScript signature changed is changed, whatever its Dafny text; parameters compared by position
    changed = True
    while changed:
        changed = False
        for b in list(same):
            calls = set(re.findall(r'\b([A-Za-z_][A-Za-z0-9_]*)_candidate\s*\(', strip_comments(cf[b]['body'])))
            calls.discard(b)
            if any(c in cf and c not in same for c in calls):
                same.discard(b); changed = True
    for base in cf:
        if base not in same:
            continue
        start = cf[base]['pos']
        b0, b1 = _body_span(clean, start)
        names = ', '.join(n for n, _ in cf[base]['params'])
        edits.append((b0, b1, '{ ' + base + '_parent(' + names + ') } // identical to the parent: equal by identity'))
        aliased.append(base)
    for b0, b1, rep in sorted(edits, reverse=True):
        cand_text = cand_text[:b0] + rep + cand_text[b1:]
    return cand_text, aliased


def skeleton(text):
    """The file with every lemma body emptied and the support block removed: what the theorem is."""
    text = SUPPORT_RE.sub('', text)
    return re.sub(r'(\{ // PROOF (\S+)\n).*?(\} // END \2)', r'\1\3', text, flags=re.S)


def fill(text, support='', bodies=None):
    """Play the prover: put proof bodies into the lemmas and append support lemmas."""
    for name, body in (bodies or {}).items():
        text, n = re.subn(r'(\{ // PROOF ' + re.escape(name) + r'\n)(.*?)(\} // END ' + re.escape(name) + r')',
                          lambda m: m.group(1) + body.rstrip('\n') + '\n' + m.group(3), text, flags=re.S)
        if n != 1:
            raise Refusal(f'proof names a lemma that does not exist: {name}')
    if support.strip():
        text = text.rstrip('\n') + '\n// BEGIN SUPPORT\n' + support.rstrip('\n') + '\n// END SUPPORT\n'
    return text


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--parent', required=True)
    ap.add_argument('--candidate', required=True)
    ap.add_argument('--scope', required=True)
    ap.add_argument('--edit', required=True)
    ap.add_argument('--out', required=True)
    a = ap.parse_args(argv)
    try:
        pt, ct = open(a.parent).read(), open(a.candidate).read()
        pt, ct, prelude = merge_preludes(a.parent, a.candidate, pt, ct)
        text = generate(pt, ct, json.load(open(a.scope)), json.load(open(a.edit)), prelude)
    except Refusal as e:
        print('theorem: refused: ' + str(e), file=sys.stderr)
        return 1
    with open(a.out, 'w') as fh:
        fh.write(text)
    print(f'theorem: wrote {a.out} ({len(lemma_names(text))} lemmas)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
