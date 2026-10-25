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
    for m in re.finditer(r'\bfunction\s+(?:method\s+)?(?:\{[^}]*\}\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*(<[^>(]*>)?\s*\(', clean):
        name = m.group(1)
        if suffix is None:
            base = name
        elif not name.endswith('_' + suffix):
            raise Refusal(f'{label}: function {name} does not end in _{suffix}')
        else:
            base = name[: -len(suffix) - 1]
        if not IDENT.match(base):
            raise Refusal(f'{label}: bad function name {name}')
        if m.group(2):
            raise Refusal(f'{label}: generic function {name} is outside the subset of the generator')
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
        found[base] = {'params': params, 'ret': ret, 'pos': m.start()}
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


def check_forbidden(text, label):
    clean = strip_comments(text)
    for pat, name in FORBIDDEN:
        if re.search(pat, clean):
            raise Refusal(f'{label}: contains {name}, which can make a proof vacuous')


def lemma_names(skeleton_text):
    return re.findall(r'^lemma\s+([A-Za-z0-9_]+)', skeleton_text, flags=re.M)


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
    for f in funcs:
        if f not in pf:
            raise Refusal(f'scope lists {f}, which the parent does not define')
        if f not in cf:
            raise Refusal(f'scope lists {f}, which the candidate does not define')
        if (pf[f]['params'], pf[f]['ret']) != (cf[f]['params'], cf[f]['ret']):
            raise Refusal(f'{f}: signature of candidate differs from parent')
    extra_edits = sorted(set(edit) - set(funcs))
    if extra_edits:
        raise Refusal('edit lists functions that the scope does not: ' + ', '.join(extra_edits))

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
        out.append(f'predicate InScope_{f}({params}) {{ {ins.strip()} }}')
        out.append(f'lemma Equal_{f}({params})')
        out.append(f'  requires !InScope_{f}({names})')
        out.append(f'  ensures {f}_parent({names}) == {f}_candidate({names})')
        out.append('{ // PROOF Equal_' + f)
        out.append('} // END Equal_' + f)
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
