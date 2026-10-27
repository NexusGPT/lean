# Open-key reads: a string or number key on a record, an uninterpreted lookup
## The construct
`TABLE[k]` where `k` is not a finite union of string literals (a `string`, a `number`, a template, an unknown) and
`TABLE` is one plain record with declared data fields (`const KIND = { email: "EMAIL", web: "USER_ID" }`,
`row: Row`), or a number-keyed dictionary (`Record<number, T>`). The finite-key reading (dynamic-record-reads.md)
and the string dictionary reading are unchanged.

## Its JavaScript meaning
The receiver is evaluated, then the key, once each. The key becomes a property name (a number `1` is `"1"`); the
name is looked up on the object, then its prototype chain. A declared field returns its value; a name the object
does not hold returns undefined; `"toString"`, `"constructor"` or `"__proto__"` return members of Object.prototype.

## The reading
One bodiless function of the receiver value and the key, named by the receiver, key and result Dafny types:
`ext_open_key_read_to_<R>_<D>_<K>(r, k): R`, pure (a record is a value). `KIND[s] === "USER_ID"`, `s: string`:
`(wld, ext_open_key_read_to_Any_Rec_1tfzr84_string(t0_, s) == ext_Any_of_string_string("USER_ID"))`,
`t0_` the module record read from the world. R is the read's own type, and only a type that holds undefined: TS
types an open key on a record without an index signature `any` (R = `Any`, which holds undefined, a field value
and an inherited member alike); a dictionary whose values are typed `T | undefined` gives `Option<T>`.

## What stays refused (dynamic-key unless named; an escape fixture each, fixtures/escapes/ts/)
- a read typed without undefined, `Record<number, string>` read as `string` (open_key_absent): an absent key
  reads undefined, and a lookup typed `string` would claim a value it never has;
- a record holding a method (dynamic_record_string) or an accessor (open_key_getter): the key may select the
  method or run the getter; a class instance (open_key_class): the key reaches its prototype, which the record
  value does not hold; a typed array falls under the method rule;
- a symbol key (open_key_symbol); a key containing a call (open_key_call); a union receiver (open_key_union);
- a write through an open key, `index-assign` (open_key_write).

## Soundness
A bodiless function proves an equality only when it holds for every interpretation, and the real lookup is one of
them, provided the result type can hold every real answer (hence the undefined rule) and the arguments determine
the real answer. The arguments determine it when the record value determines the object: lean reads a value of a
record type as its declared fields, the premise every record reading shares (at base 67b8201
`JSON.stringify(r)` against `JSON.stringify({ a: r.a, b: r.b })` is PASS-proved). Under it two plain records with
equal fields answer every key alike, Object.prototype members included. The cases a wrong reading would equate:
a case split over declared keys with undefined otherwise is wrong for `"toString"`, so it is not used; a result
typed by the value type alone is wrong for an absent key, so it is refused; a getter or method could run code or
differ per object, a class instance carries another prototype, so both stay out. A changed record, key or result
type gives another argument or another function: never proved equal.
An open key is usually followed by `??`, so the any operand of `??` and `?.` is now tested: `x ?? d` reads
`if is_null_Any(x) || is_undefined_Any(x) then d else x`, and `x?.f` reads undefined for a null or undefined x (the
predicates `x == null` uses). At 67b8201 both read the left alone, and the pair's orDefault
(`(x ?? "A") === "A"` against `(x ?? "B") === "A"`) and lengthOf (`x?.length` against `x.length`) were PASS-proved.
Still incomplete, never unsound: in `x?.a.b` the outer read is not cut short, so it proves less than it could.

## Lint and lane B
lint.mjs `openKeyRefusal`, translate.mjs `openKeyRead` beside `elemAccess`; an any key takes `Any_index`. Lane B runs
the JavaScript on generated records and keys, absent keys included. exec/usage.mjs records `x?.f` as a null and
undefined test of x (as `x ?? d` already is), so such an input draws both first. Pair open_key_read: numberName,
orDefault and lengthOf WITNESS; isText and hasMedia PASS-bounded.

## Instances (W/architecture/estate-coverage/units.jsonl, lint at this branch)
- nexus packages/types/src/shared/domain/customer/customer-identity.config.ts:92 usesUserIdIdentifier: enters.
- nexus apps/backend/src/_common/utils/twilio-attachment.helper.ts:52 extractTwilioAttachments: enters.
- nexus apps/backend/src/public/v1/infrastructure/filters/http-exception.filter.ts:146 codeForStatus: stays out,
  `Record<number, string>` read as string (absent key).
- langchainjs .../langchain-ibm/src/chat_models/ibm.ts:218 getRole: stays out, read typed string.
- nexus apps/backend/src/workspaces/domain/value-objects/unnarrowed-workspace.ts:69: stays out, symbol key.
- n8n packages/editor-ui/src/utils/templates/templateTransforms.ts:80: stays out (template-pattern index).
