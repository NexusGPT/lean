# A unit named with a Dafny keyword: one name for the function and its lemma

## The construct

A top-level function, an arrow const or a class method whose name TypeScript allows and Dafny reserves: `label`,
`print`, `map`, `type`, `set`, `match`, `assert`, `expect`, `bool`, a component `Label`. TypeScript reserves only its own
keywords (`function type()` and `function print()` are ordinary declarations); Dafny reserves its keywords and lean's
prelude declares more names (`Option`, `value`, `Null`).

## Its meaning

The name has no meaning of its own: ECMA-262 binds a function declaration's identifier in its scope, and nothing about
the function's behaviour depends on how it is spelled. Only the Dafny text has to spell it differently.

## The reading

One function names a unit's Dafny identifier: `dn` in `langs/ts/common.mjs` (moved there from translate.mjs, exported
with `RESERVED`). A character outside `[A-Za-z0-9_]` becomes `_`, a leading `_` takes a `u`, a reserved word takes a
trailing `_`. The translator names every unit `dn(snake(name))` plus the side suffix, so `label` is `label__parent` and
`label__candidate`; spec/theorem.py strips the suffix and writes the lemma `Equal_label_`. check.mjs names the unit's
lemmas through `dafnyName(unit) = dn(snake(unit))`: the main lemma, its UNGUARDED line, its canonical-heap parts, its
CELLS line, its adapter key (scope file and comment door), and the units agreeCore counts as held. The suite builds the
differential `print` line with `dn(snake(fn))` and reads canonical parts through `canonPartsOf`.

Of the two choices the lane file offered (call `dn(snake(unit))`, or read the name theorem.py wrote) this note takes the
first: the theorem file holds the names of every unit it compared, and picking "ours" among them would need the same
rule again to know which one is the unit asked for. Calling the one exported `dn` keeps a single rule by construction.

The canonical-heap parts of a unit `f` are `EqualCanon_<f>_<part>` with `<part>` one lower-case word
(spec/theorem.py: initial, cells, roots, named, result, inrange). The old filter took every key starting
`EqualCanon_<f>_`, so the unit `foo` also took the parts of a unit `fooBar` (`EqualCanon_foo_bar_initial`), and the unit
`label`, asked under the name `label`, took the parts of `label_` by accident. `canonPartsOf(keys, f)` takes this unit's
parts only.

    function type__parent(xs: seq<int>): int
    {
      |map__parent(xs)|
    }
    lemma Equal_type_(xs: seq<int>)
      requires !InScope_type_(xs)
      ensures type__parent(xs) == type__candidate(xs)

## What stays refused

Nothing new. The reading is a naming rule; a unit enters or stays out of the subset by the lint as before.

## Soundness

A wrong name never proves a difference equal by itself: a lemma name that matches no lemma reads as unproved (the ASK
this lane removes). The case that could is a name that matches ANOTHER unit's lemma. The old canonical filter did:
with its own lemma failing and no parts of its own, a unit `foo` would have been read as proved by the parts of
`fooBar`. The exact part filter closes it. Two units whose Dafny names coincide (`fooBar` and `foo_bar`) are not
read here and were not measured.

## The lint

No change: no construct is admitted or refused differently.

## What lane B sees

Nothing changes: lane B runs the JavaScript, where the name is the TypeScript name.

## Instances (parse-only walk with census.mjs's file rules, every unit `topLevelFunctions` lists)

The nexus bench tree: 26,520 units, 12 with a reserved Dafny name; langchainjs: 4,871 units, none. Every one of the 12
now has its lemma read under the name theorem.py writes:
- `apps/backend/src/_common/domain/result.ts:64` map, `:116` match
- `apps/frontend/src/common/components/UI/Label/index.tsx:13` Label (snake case `label`)
- `apps/frontend/src/common/services/localStorage.service.ts:112` set
- `packages/types/src/api/public/v1/schemas/analytics-catalog.ts:72` label
- `packages/types/src/server/result.ts:82` map, `:168` match, `:214` expect
- `packages/types/src/shared/domain/tools/nexus-api-actions.ts:88` bool
- `tools/nexus-studio/server/src/lib/jwt-cache.ts:57` set
- `apps/backend/test-distributed-locks.ts:15` and `packages/claude-code-skills/shared/helpers.ts:9` assert

## The pair

`tests/pairs/reserved_units`: label makes the same outside call and writes its sum the other way round (proved),
print changes its brackets (WITNESS), map is untouched, type calls map unchanged (proved). Its `check` entries run
check.mjs on label, map and type (PASS-proved) and print (WITNESS); on the base commit map and type read ASK:unproved.
