# Dynamic record reads and own-property enumeration

A bracket read evaluates its receiver, then its key, once each. JavaScript converts the key to a
property name and searches the object and its prototype. An absent property returns undefined.
This lane chooses conditional field selection, not conversion of the whole unit to maps. Existing
record updates and heterogeneous field types therefore keep their representation.

A finite string-literal key selects declared data fields. `keyof typeof r` enters when the checker
resolves it to that finite union. Narrowed keys use the checker's type at the read. For example:
`r[k]`, with `k: "a" | "b"`, becomes `(var rr := r; var kk := k;
if kk == "a" then rr.a else rr.b)`. Both branches have the expression's Dafny type: a homogeneous
primitive, Option for optional fields, or Any for heterogeneous fields. Optional fields are read
without unwrapping until selection and conversion finish. The final branch is exact on the typed
key domain; Dafny quantifies over additional strings, which can only make equality harder to prove.

Unrestricted string keys remain `dynamic-key`: a structural record type is not a closed runtime
key set. Returning None for every undeclared name would erase extra properties and inherited
members. A future open-record map needs an explicit prototype/extra-property channel; an Option
alone does not solve that. Numeric keys and dynamic writes on records remain refused
(`dynamic-key` and `index-assign`). Pure dictionaries retain their existing map reading.
Calls inside a record key remain `dynamic-key`: bind the key first, since a key call can mutate
the selected object. Method-valued keys and optional receivers remain `dynamic-key`; binding and
conditional evaluation require another reading. Literal or finite keys containing `constructor`,
`prototype`, or `__proto__` are `prototype`, including bracket syntax. Missing declared keys are
`dynamic-key`, never a fabricated field. A declared optional field can genuinely return undefined,
represented by None under the repository's existing null/undefined abstraction.

Object.keys/values/entries enumerate own enumerable string properties. An immediate plain record
literal supplies an exact sequence. A const local initialized by such a literal also qualifies when
its initializer is pure, its fields are data, and all its uses are enumeration calls: it cannot
escape, be rebound, or have fields added/deleted.
Integer-index names precede other names in ascending numeric order; other strings follow their
first insertion order. Duplicate keys keep the first position and the last value. Symbols, spreads,
computed names, accessors and prototype-setting literals do not enter this exact path. Required
fields with an undefined value still count; optional absence is not inferred from the field value.
Every initializer is evaluated once in source order, even for Object.keys.

For example Object.keys({b: 2, a: 1}) is ["b", "a"]. Values and entries use the same ordering,
with each field converted to the resolved array element type. Unknown provenance uses an
uninterpreted world transition. A pure oracle of the record would equate two distinct objects
with equal fields but different insertion order, even at two calls inside one function. The world
keeps those reads distinct; a source-file discriminator also prevents reuse across changed local
constructions whose order the datatype erased. This deliberately sacrifices proofs of refactors
with unknown order rather than guessing from a parameter's type. Dictionary oracles are unchanged.
Object.assign/freeze/fromEntries remain uninterpreted in this lane: mutation, frozen writes and
entry coercion need separate readings; treating freeze as identity would hide later write faults.

The lint narrows the pre-existing permissive dynamic-key implementation to the supported cases;
the coverage text lagged behind that implementation. No shared helper signature changes.
Lane B executes JavaScript on generated records and literal-union keys, including optional absence.
The pair checks field remapping, a switch refactor, keyof, optional/heterogeneous reads, counts,
values, entries, insertion order, numeric-key order, evaluation effects and an untouched unit.

Read instances (paths relative to the census/export root under W (the harness directory named in BRIEF.md)):
- nexus/tools/mission-control/server/src/schema/quest-rpg.schema.ts:73 calculateQuestXP:
  numeric record key, refused; no numeric coercion is invented.
- status/src/domain/uptime.ts:39 buildUptimeWindow: finite WindowKey lookup enters.
- nexus-learning/packages/claude-code-skills/scripts/reference.ts:217 renderPreflight:
  finite ExitClass reads enter; unrelated lint rules still stop the unit.
- n8n/packages/core/src/NodeExecuteFunctions.ts:1766 normalizeItems:
  unknown enumeration needs the world; parameter rebinding stops the unit.
- n8n/packages/cli/src/services/curl.service.ts:117 isJsonRequest:
  dictionary enumeration retains its oracle; unrelated statement translation fails.
- nexus-learning/packages/schema/src/uid.ts:60 uidKind:
  module record enumeration needs the world; finite RegExp-field reads enter.

Validation output and stable-sample before/after bench results are in results-bench/.
The baseline uses master c9847d8 as directed by the lead. Both final bench runs use the unchanged
harness after stable crc32 sampling (9682b58) and parent-specific mutant names (3ba4ea6).
Earlier random samples and runs before the filename fix are superseded.
