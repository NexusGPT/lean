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
            pt, ct = [t for _, t in pf[f]['params']], [t for _, t in cf[f]['params']]
            what = [f'parameter count {len(pt)} became {len(ct)}'] if len(pt) != len(ct) else []
            what += [f'parameter {k} type {a} became {b}' for k, (a, b) in enumerate(zip(pt, ct), 1) if a != b]
            what += [f"return type {pf[f]['ret']} became {cf[f]['ret']}"] if pf[f]['ret'] != cf[f]['ret'] else []
            raise Refusal(f'{f}: signature of candidate differs from parent (Dafny: ' + '; '.join(what) + ')')
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
    cand_text, aliased = alias_identical(parent_text, cand_text, pf, cf, sig_differs)
    # a heap-core unit carries the hypothesis its inputs satisfy in the typed program (`// HYP <name>: <expr>`, written
    # by the translator); the lemma assumes it. Both sides must state the same hypothesis, or there is no one theorem.
    hyps = {}
    for label, text, suffix in (('parent', parent_text, '_parent'), ('candidate', cand_text, '_candidate')):
        for m in re.finditer(r'^// HYP ([A-Za-z_][A-Za-z0-9_]*): (.+)$', text, flags=re.M):
            name = m.group(1)
            if not name.endswith(suffix):
                raise Refusal(f'{label}: hypothesis for {name} does not end in {suffix}')
            hyps.setdefault(name[: -len(suffix)], {})[label] = re.sub(r'\s+', ' ', m.group(2).strip())
    for f, h in hyps.items():  # compared with the parameters by position: the lemma states the parent's, over the parent's names
        if f in funcs and (h.get('parent') is None or h.get('candidate') is None or _by_position(h['parent'], pf[f]['params']) != _by_position(h['candidate'], cf[f]['params'])):
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
    for f, s in sigs.items():
        if f in funcs and f not in aliased and sig_diff.get(f):
            unguarded[f] = f"interface differs: {sig_diff[f][:300]}"
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
            if ins.strip() == 'false':
                continue
        out.append(f'lemma Equal_{f}{tp}({params})')
        out.append(f'  requires !InScope_{f}({names})')
        if f in hyps:
            out.append(f'  requires {hyps[f]["parent"]}')
        out.append(f'  ensures {f}_parent({names}) == {f}_candidate({names})')
        out.append('{ // PROOF Equal_' + f)
        out.append('} // END Equal_' + f)
        if canon_fuel and f in hyps and f not in aliased and f not in unguarded and sig['params'] and sig['params'][0][1] == 'HWorld' and sig['ret'].replace(' ', '').startswith('(HWorld,'):
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


def _norm(text, suffix):
    t = strip_comments(text)
    t = re.sub(r'_' + suffix + r'\b', '', t)
    return re.sub(r'\s+', ' ', t).strip()


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


def _norm_params(text, suffix, params):
    """_norm with every parameter name replaced by its position: two functions whose texts agree this way differ only
    by a consistent renaming of their parameters (a bound name), so they are the same function. A name after a dot is a
    field, never a parameter. Every other identifier is kept as written, so an equal text never maps a parameter onto a
    name that means something else on the other side."""
    return _by_position(_norm(text, suffix), params)


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
    same = {b for b in cf if b in pf and b not in exclude and _norm_params(pf[b]['body'], 'parent', pf[b]['params']) == _norm_params(cf[b]['body'], 'candidate', cf[b]['params'])} # a unit whose TypeScript signature changed is changed, whatever its Dafny text; parameters compared by position
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
