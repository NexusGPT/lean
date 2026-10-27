# Decorators: a contract table, a metadata cell, two prototype idioms

## The construct

A TypeScript decorator (`experimentalDecorators`) is a function the class definition calls once: on the class, a
method's descriptor, a property, or a parameter's index. It may record metadata (`Reflect.defineMetadata`), wrap or
replace what it decorates, and a framework may later read what it recorded. In Nest, `@UseGuards(G)` makes the router
run `G.canActivate` before the handler and throw `ForbiddenException` on false; `@Param("id", P)` makes the router pass
the route parameter through `P.transform`; `@SetMetadata(k, v)` writes the cell (k, handler), and a guard reads it with
`Reflect.getMetadata(k, context.getHandler())` or Nest's `Reflector`. Before this note lean read a decorator as text in
the signature: a changed decorator was `ASK:interface`, an unchanged one was ignored, and `Reflect` was refused.

## The table

`translate/decorators.json` (research 2026-10-27, section 1), read by `decorators.mjs`. A row is keyed by package and
export and states the wrapper relation in a closed vocabulary: `kind` (route, guard, pipe, inject, metadata, marker),
`target`, `body` (always `unchanged` here: no listed decorator replaces the method), `guard`, `pipe`, `inject`,
`metadata` (the cells written or read), `errors`, `effects`, `framework`, `version`, `fixture`. Rows: the ten most
used framework decorators of the challenge's census of the Nexus monorepo (Injectable, Inject, ApiResponse, Param,
ApiOperation, ApiProperty, Get, Post, Body, ApiParam; the repository's own decorators are not framework rows),
UseGuards for the guard relation, and the metadata APIs: SetMetadata, Reflect.getMetadata (with Nest's `Reflector.get`
as the same read and `getAllAndOverride`, `getAllAndMerge`, `getAll` as its family), Reflect.defineMetadata. Version
ranges come from the monorepo's backend `package.json` (@nestjs ^11, reflect-metadata ^0.2.1).

## The readings (lane A), one per kind

- guard: the handler is the guard's verdict gating the body, class guards outermost, then method guards. In a pure
  unit `if !ext_guard_<k>() then ext_route_denied_int() else <body>`; in an effectful unit the verdict is a transition,
  `var (wld, guard0_) := ext_guard_<k>(wld); if !guard0_ then ext_route_denied_<T>(wld) else <body>`.
- pipe: the parameter is rebound to the pipe's result before the body, `var id := ext_pipe_<k>_int(id);`, pipes in
  argument order (a leading string argument names the property and is no pipe).
- inject: the injected parameter or field is read as today (a parameter is universally quantified; a receiver field is
  part of the receiver), which is the row's relation: a value fixed at construction.
- route and marker: the body is unchanged; the decorator joins the file's decoration (below) and stays text in the
  signature, so a changed route path is still an interface change.
- metadata read (`Reflect.getMetadata(k, t)`, `r.get(k, t)` on a field declared `Reflector` from @nestjs/core):
  `var (wld, t0_) := ext_md_get_...(wld, <decoration>, k, t);`. The decoration is a map literal of every decorator site
  of the file (`Class|member#param|i`) and every load-time statement, each by its text and a sha256 of the same-file
  declarations it names. The family reads are `ext_md_<method>` of the same arguments.
- metadata write (`Reflect.defineMetadata(k, v, t)`): `var (wld, t1_) := ext_md_define_...(wld, k, v, t);`.
- the plain-object test `Object.getPrototypeOf(x) === Object.prototype` (either order, `!==`) on a record value is
  `true` (`false`); the own-key test `Object.prototype.hasOwnProperty.call(o, k)` is `(k in o)` on a dictionary and
  `(k in {"a", "b"})` on a record whose declared fields are all required.

Every guard, pipe and decoration is named by a sha256 of its text and same-file closure (`translate.mjs`'s short
`hash` is a 32-bit sum: two guards named alike would be one function). Each unit's header names the rows its reading
used (`// DECORATORS admin_read_parent: @nestjs/common:UseGuards`); `check.mjs` lists them in the certificate with their
version and fixture status.

## Soundness

- The guard's verdict, the pipe and the denial are uninterpreted and the same on both sides. A lemma proved over them
  holds for every interpretation, the always-true guard and the identity pipe among them, so what the route reading
  proves of a handler it proves of a direct call of the method too (no caller is misread).
- A metadata reader takes the file's decoration as an argument: a writer changed anywhere in the file, listed or not
  (a repository's own `@Roles` wrapping SetMetadata included), changes the map, and the reader is unproved. The read
  and the write are transitions: a read after a write reads the world the write returned. No axiom ties a write to a
  later read (the theorem refuses axioms), so a reordered read and write never prove equal.
- A same-file guard or pipe class whose body changed changes the closure hash, so the gate names another function.
- A row is trusted only for its framework version. A row whose fixture disagrees withholds every proof that read it
  (`ASK:decorator-model`, the mirror of `ASK:library-model`); a pending fixture leaves the reading on and says so.
- The plain-object and own-key readings rest on the record invariant lean's value reading already holds: a record
  value is a plain object whose own keys are its declared keys. A class instance passed where a record is declared
  breaks it; lane B draws plain objects only, so it cannot catch that case.

## What stays out

Decorators that replace the method body or rewrite the constructor (none is listed; an unlisted decorator keeps its
text reading), `Proxy`, prototype writes, `Reflect` beyond the rows (`hasMetadata`, `getOwnMetadata`, `get`, the
property-key form `getMetadata(k, target, key)`), the plain-object test against `null` or on `object`/`unknown`, the
own-key test on a record with an optional field or on `any`: the lint keeps the rule `prototype` (escapes
`metadata_unlisted_api`, `plain_object_test_nonrecord`, `own_key_optional_field`). A unit in the heap core is emitted
by `heap.mjs`, which does not read the route wrapper: there the handler stays its body (the reading before this note).

## Lane B

A package of the table answers its guard, pipe and SetMetadata exports by their rows (`exec/run.mjs`): a handler call
runs its guards (a same-file guard runs its own `canActivate`, any other a seeded verdict) and throws
`ForbiddenException` on false, then its pipes (a same-file pipe runs `transform`, any other a seeded value of the
parameter's type). SetMetadata writes the sandbox's metadata store; the sandbox's `Reflect.getMetadata` walks the
target's prototype chain, and a field declared as Nest's `Reflector` reads the same store. A fake target (a handler the
framework hands in) reads one written cell of its key, chosen by the seed, or none.

## Fixtures

`lean-v3/harness/decorators/<package>/<export>.fixture.ts`, one per row, run by `run.mjs` there against an installed
copy (Nest's own `ExternalContextCreator` runs guards and pipes, no HTTP server). The census-env copy holds no
`node_modules` yet: every row is `pending`.

## Instances (the census-env copy of the Nexus monorepo, lint run on each file)

- `packages/types/src/schemas/AccessCard/policy/is-action-permitted.ts:13`, own-key test on the policies: enters.
- `packages/types/src/shared/domain/agents/agent-prompt.utils.ts:129`, own-key test on a constant record: enters.
- `apps/backend/src/tools/tools-internal/tool-utils.ts:17`, on `Record<string, string>`: enters; line 37, on `any`: out.
- `apps/backend/src/public/v1/routing/infrastructure/harvest-public-routes.metadata.adapter.ts:46,59`: enter; 84, 130
  (the property-key form) and 162 (`Reflect.get`): stay `prototype`.
- `apps/backend/src/_common/prisma/sanitize-empty-uuid.ts:225`, the plain-object test through a local on `object`:
  stays `prototype`.
- `apps/backend/src/permissions/infrastructure/guards/feature-access.guard.ts:57`, `reflector.getAllAndOverride`: a
  family read (the file's other refusals are `unresolved-module`: the copy has no dependencies).
