# Stage 5 rank 16: local type declarations erased, import.meta as a world read

The construct: `type Pair = { key: string; n: number }` or `interface Opts { sep: string }` declared inside a function
body, and `import.meta.url`. Before this rank the lint refused the declarations as `unsupported-syntax` ("statement
TypeAliasDeclaration is outside the subset") and `import.meta` as an expression with no reading.

## The reading

A type alias or an interface has no run-time meaning: TypeScript erases it, and every use of the name is already read
through the checker (the unit's declared types, the literal's contextual type). The lint and both statement translators
(the core `tr` and the proof-shape `stmts`) skip the declaration; nothing else changes, so a unit that declares its
types locally translates to the same Dafny as one that writes them inline (pair unit `parse`), and a renamed alias is
equal by identity (`widen`). A local `enum` keeps its refusal: it is an object of its members at run time.

`import.meta` is a fact of the module as loaded, not of the unit: `import.meta.x` (through a cast too,
`(import.meta as { url: string }).url`) is one world read, `global_read_import_meta_<x>`, of the member's type, and the
unit threads the world (`containsEffect`), as a lib global read does (stage 5 rank 7). Lane B gives it the loader's
real value, the same on both sides. `import.meta.env` is injected at build time and lane B refuses to load it, so the
lint refuses it; `new.target` reads how the function was called and stays out.

What stays refused, each with an escape fixture (`fixtures/escapes/ts/local_declarations_*.ts`), rule
`unsupported-syntax`: a local `enum`, `new.target`, `import.meta.env`.

## Measurement

Pair `local_declarations`: `parse` (types inlined, proved), `summary` (WITNESS), `here` (a fragment appended to
`import.meta.url`, WITNESS), `label` (untouched), `widen` (alias renamed, proved by identity). Census (`node langs/ts/census.mjs`, the rank 15 state as the base): nexus 23,745 to 23,756 of 26,520
(`unsupported-syntax` 129 to 109 units); langchainjs 3,489 to 3,491 of 4,871. The stage 5 table predicted 17 and 2 alone.
