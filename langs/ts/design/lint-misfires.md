# Lint misfires found on a real rewrite, and two false proofs under them

A lane rewrote one application folder by folder with the lint's list and met eight shapes the lint refused or misread
although each has a faithful reading. Reproducing them showed two base defects that proved different behaviours equal.
Each reading below is a language construct; `lint.mjs` and `translate.mjs` read it through one shared predicate.

## Two soundness fixes (first)

- A block's declarations end with the block (ECMA-262 14.2.2: a Block, a case block, a catch clause, a for header and a
  call each make a new declarative environment). The translator writes a statement list as one chain of `var` bindings,
  so `const x = n; { const x = 2; ... } return x;` read the inner x after the block; the base PROVED it equal to
  `return 2` (lane B: WITNESS). Now `scopeFor` (translate.mjs) saves each outer binding a block shadows and rebinds it
  where the block ends, and before a `break`, `continue` or forEach-step `return` that leaves it:
  `var sc0_ := x; var x: int := 2; ...; var x := sc0_;`. Already scoped at the base: if/else branches on the path that
  joins (a tuple of the assigned names), callback lambdas, a counted for's index. Not scoped at the base, scoped now: a
  bare block, an if body on the returning path, loop bodies (the next step's arguments), case blocks, try, catch and
  finally bodies, a general for's header, a local procedure's splice. A binding is saved only when it is read again (after
  the block, or anywhere in an enclosing loop or function); a switch head that assigns a shadowed name fails translation.
- `X ?? fresh`, `a || b`, `c ? a : b` hold what their operands hold. `const l = m.get(k) ?? []; l.push(1)` was inside the
  subset and read as a copy, so a unit pushing into the caller's Map was PROVED equal to the unit without the push
  (lane B: WITNESS). The lint now reads the declaration as an alias of `m.get(k)` (`heldBy`), `alias-mutation`.

## The eight readings

- Finding 1: `m.index`, `m.input` (`execMatchMember`, common.mjs). For a regular expression literal without g and y, `re.exec(s)`
  and `s.match(re)` start at 0 and leave lastIndex alone (22.2.7.2), so index and input are functions of the pattern and
  s: `regex_index(re, s)` (one bodiless function) and `s`, when m is a const bound to that call and s a literal or a name
  the unit never writes. An accessor of the match array alone would be unsound: two matches with equal items may sit
  at different places. A global literal stays `unsupported-member`.
- Finding 2: A bucket map (`bucketMaps`, common.mjs): `const m = new Map<K, T[]>()` filled with array literals; `m.get(k)?.push(a)`
  as a statement (the push runs only when k is present, 13.3.9) is `m := if k in m then m[k := m[k] + [a]] else m`:
  `var bk0_ := h.k; var m := if bk0_ in m.m then OMapPut(m, bk0_, m.m[bk0_] + [h.v]) else m;`. A use of the map that
  may hand an array to another name (iteration, `values()`, a call), followed by a push, refuses the map.
- Finding 3: A bucket local, `const l = m.get(k)` under `if (l) l.push(a)` or `const l = m.get(k) ?? [..]; l.push(a); m.set(k, l)`,
  is the map's array when k is present: the push changes l and writes l back at k (no map write runs between the
  binding and a use of l). On a Map the unit did not build both forms are `alias-mutation`. A push on a narrowed
  optional local now changes the value inside its Some (a base type error).
- Finding 8: A local procedure whose parameter or local shares a name with the unit is still a procedure: the splice saves and
  rebinds the outer name (the scoping above). A loop inside a procedure now reads the procedure's parameters.
- Finding 9: Math.min/max over a spread of a name (`xs`, `xs.map(f)`, `xs.slice()`, `[...xs]`) under a dominating test of
  `xs.length` in any equivalent form, in `?:`, `if`, `&&`/`||` or an earlier `if (...) return`, with no write between.
- Finding 10: An alias rebound to a fresh value (`flat = []`) with no write in between, and no rebinding in a loop around the
  change, is that value (`aliasAt`); the base treated the declaration as an alias at every site.
- Finding 11: `await new Promise((res) => setTimeout(res, ms))`: one outside call handed the resolver itself is the callback bridge
  (`promise-forms.mjs`), one opaque transition keyed by the executor's text, as `(v) => res(v)` would be.
- Finding 12: A local procedure with a defaulted parameter: a call that leaves it out binds the default (10.2.11); a call that passes
  it a value whose type admits undefined keeps the function a callback (`closure-mutation`).

## What stays refused (escape fixtures)

`map_value_alias.ts` (alias-mutation), `bucket_map_escape.ts` (param-mutation: an array escapes before a push),
`match_index_global.ts` (unsupported-member), `math_empty_other_array.ts` (math-empty), `alias_rebound_in_loop.ts`
(alias-mutation), `local_procedures_default_undefined.ts` (closure-mutation; it replaces `local_procedures_shadow.ts`,
whose shape is now read).

## Lane B

Lane B runs the code, so it needs no reading; it gives WITNESS on both base false proofs and on the pair's changed units.

## Measurement

Pair `lint_misfires` and the differential cases `tests/cases/lint_misfires.ts` (Node and Dafny on the same inputs; the
base translator gives other answers on `blockScope` and `scopedJumps`). Census numbers: the lane report.
