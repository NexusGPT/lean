# The callee census: the build order of the world library (2026-11-01)

Lane w2a-callee-census, workstream W2 (`briefs/da-v4/w2-world.md`). Code: `callees.mjs`, `census.mjs --callees`,
`census.mjs --callee-table`. Test: `tests/census_callees.mjs` (suite row `census-callees`). The measured tables:
`design/callee-census-2026-11.md`.

## What

`census.mjs <root> --callees` adds, per file record:

- `callees`: per unit, every call, `new` and tagged template whose target lies outside the file, as
  `[module, member, origin, calls]`. A call belongs to the innermost unit holding it (a callback is a unit of its own).
- `calleeBlocked`: per refused unit whose every refusal names a call outside the file that `translate/library.json` has no
  row for, `{ keys, origins, rules }`: the callees those refusals name and the rules that refused.

and to the JSON and the report the ranked table `calleeTable`: per callee the units blocked only by it (`onlyBy`), the
units whose refusals name it alone or beside others (`among`), the units calling it (`callers`), its calls, the rules that
named it, and `cumulative`: the units every callee of which ranks at or above the row. `census.mjs --callee-table
<a.json>...` builds one table over many `--callees` runs (a population); `--origins` restricts the rows to a view (the
world library is `ecmascript,web,node,package`), while `cumulative` still requires every key of a unit, so a unit that also
needs a project callee is never counted as let in by the world library.

## The key of a callee

Read off the call site first, the declaration second (`callees.mjs calleeOf`):

1. the callee is an access path whose root is an import: the module the import names (a Node built-in as `node:<name>`,
   a package by its specifier, a source file of the repository by its path from the root, the file the checker resolves
   the import to; a workspace package linked to its sources is the project's) and the path below the binding. So
   `fs.readFileSync` under `import fs from 'node:fs'` and `readFileSync` under `import { readFileSync } from 'fs'` are one
   key, `node:fs readFileSync`;
2. the root is a global that only declaration files outside the project declare: `global` and the path (`global
   JSON.parse`, `global fetch`, `global new Date`);
3. otherwise the declaration the checker resolves the call to (`getResolvedSignature`, else the symbol): the ambient module
   it sits in, else the package whose `node_modules` folder holds it, else `global` for the language's and the host's
   declaration files, else the project file; and its containers, with `X.prototype.m` for an instance member and the
   language's `XConstructor`/`ReadonlyX` read as `X`, the names `library.json` uses (`global Array.prototype.push`,
   `global Map.prototype.get`, `global Object.keys`).

A call declared in the file itself is no outside callee. A call the checker resolves to nothing and whose root is no import
or global (a method of an `any` value) is `(untyped) <last name>`. `origin` is whose the callee is: `ecmascript`,
`web` (lib.dom, lib.webworker), `node` (a Node built-in or @types/node), `package`, `project`, `untyped`, `unresolved`.

A callee is modelled when its module is `global` and its member matches an operation of `library.json` (`new Date /
Date.prototype.set*` is two patterns, `*` one name). This is the brief's test, kept literally: the language's built-ins the
translator reads by its own rules without a row (`String.prototype.trim`, `Math.max`) are unmodelled by it, and their
origin `ecmascript` shows it in every table, so a reader can drop them.

## Which refusal names a call

A refusal is a finding that stops its unit, judged on resolved types: the census's own stop (`f.unit`, not `env`, its unit
not environment-blocked, the values it names resolving, `environmentOf`). The values it names are `namedValues`, already
the census's reading of a finding: its node (the finding's span) and each `code` its message quotes. A value names a call
when it is the call (under parentheses, `!`, `await`, `as`, `satisfies`) or is the callee of the call (`callees.mjs
namedCall`). A value that only holds a call inside it does not: `on && (n = fs.readFileSync(p).length)` is refused
(`unsupported-syntax`) for the form of the statement, which no library entry changes.

A blocked unit (stopped by its own refusals, or covered by a stopped enclosing unit) is callee-only when the chain of it and
its enclosing units holds a refusal, no unit of the chain is environment-blocked, and every refusal of the chain names at
least one unmodelled outside call; its keys are the union. It counts under `onlyBy` of C when C is its one key.

## Why this is sound as a measurement

The table claims two things, and neither is a verdict:

- a unit counted under `onlyBy` of C is refused, and every reason the lint gave for it judged the value of a call of C
  (or C itself); a unit with any refusal that judged something else is not counted. Modelling C is therefore necessary
  for the unit to enter by that route; it is not claimed sufficient (a typed model of `JSON.parse` changes what a
  `type-assertion` refusal judges; whether the refusal then lifts is the reading's question, measured when the entry
  lands, the validator of W2).
- `cumulative` at row k counts units all of whose keys rank at or above k: never a unit that still needs an entry below.

The containment reading (a refusal attributed to every call inside its values) would count units refused for their own
form; the test's `--break` runs it and the table turns red (statement counted under readFileSync). An empty library table
would count calls the table models; `--break` runs it too and the table turns red (pushes counted under push).
Nothing here reads the AACR instances: the populations are the 39 census roots and the 13 corpus repositories at their
default-branch heads, and the classification is the lint's own findings.

## The test (red first)

`tests/fixtures/census-callees/repo` with a minimal `@types/node` (`fs` as an ambient module, `node:fs` re-exporting it):
`reads` refuses two optional calls of the imported `readFileSync` and counts once under `node:fs readFileSync` (two
calls); `statement` holds the call in a statement refused for its form and is not counted; `pushes` names
`Array.prototype.push`, a library row; `sameFile` names a call of its own file; `both` names readFileSync and
JSON.stringify (among both, only by neither); `project` names `src/util.ts helper`; `outer` and its callback. The known
table: readFileSync only 3 among 4 callers 4 calls 5, rank 1 cumulative 3; helper rank 2 cumulative 4; 5 callee-only
units, one with two keys; the world view lets in 4. Before this lane the census has no `calleeTable` and the test fails
(red at 4747022f); with the mechanism it holds; each `--break` variant fails 13 checks.

## The measurement

See `design/callee-census-2026-11.md` and `lane/w2a-callee-census-result.md`: the two populations, their commands, the top
50 per population and the top 20 with their counts.
