# Lane B: the patterns of the unit's callees join the string pool (2026-10-30)

## The defect

Lane B draws strings from its edges, the unit's own literals, and samples of every regular expression of the unit's own
file (exec/spec.mjs `walkRe`, gen.mjs `spool`). A unit that hands a string to a parser in another file of its package
(`buildAttemptKeyOfToken(token)`, which matches `/^([^:]+):([1-9][0-9]*)$/` in its own file) never met a string that
parsed, so the branch that uses the parsed value never ran on either side. Battery v7 lost one planted mutant this way
(a swapped test on the absent token: both sides returned null on every input).

## The rule

The regular expressions of every local file whose function the unit calls (a call or a `new` whose callee the checker
resolves, an import followed to its declaration) join the pattern list after the unit's own file's, so a file with
patterns of its own keeps them in front, and the list keeps its cap of 12. A declaration file or a file under
`node_modules` gives none. It changes which strings lane B draws, never how a verdict is read.

## The pair

`tests/pairs/cause_callee_pattern` (lane B only): `attemptKeyOf` swaps the test on the absent token (WITNESS;
PASS-bounded before), `attemptKeyOfRefactor` writes it as an if (PASS-bounded), `hasAttempt` is untouched
(PASS-bounded). The parser lives in `token.ts` beside the pair.
