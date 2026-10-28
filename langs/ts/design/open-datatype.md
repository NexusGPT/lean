# Open datatype: a record from the outside carries what its type does not name

## Construct
A value of a record type that lean reads but does not build: a parameter, an import, a call result, a field of one.
TypeScript types are structural, so such a value may hold keys its type does not name (a caller passes a wider
object; an index signature names none of its entries), in an order lean has not seen. The constructs that see them:
a spread `{ ...s }`, `Object.assign({}, s)`, a rest pattern `const { a, ...r } = s`, an undeclared key read by dot,
bracket or `in` on a type with an index signature, a key enumeration (for-in, Object.keys).

## JavaScript meaning
CopyDataProperties (ECMA-262 7.3.25) copies every own enumerable key of the source, typed or not, in the source's
order; Object.assign (20.1.2.1) does the same onto its target; a rest pattern copies all keys but the named ones. A
property read finds an own key first, then the prototype (10.1.8.1); `in` tests both (13.10.1). for-in visits the own
keys in OrdinaryOwnPropertyKeys order (10.1.11): array indexes, then creation order.

## Reading
Every record datatype ends with its rest; a type with fields and a string index signature also holds its undeclared
keys as a dictionary (the ordered carrier of a `Record<string, V>`). Constructor defaults make a literal's value
closed, so the text of every literal site is unchanged:

    datatype More = MoreBuilt | MoreFrom(src: int)
    datatype Headers = Headers(accept: Option<string>, open_index_: OMap<string, Option<string>> := OMap([], map[]),
                               open_rest_: More := MoreBuilt)
    function copy_rec(s: Rec): Rec { s }                       // { ...s }, Object.assign({}, s)
    function by_hand(s: Rec): Rec { Rec(a := s.a, b := s.b) }  // never equal to s: its rest is MoreBuilt
    (var or0_ := h; var ok1_ := k; if ok1_ == "accept" then or0_.accept else
       (if ok1_ in or0_.open_index_.m then or0_.open_index_.m[ok1_] else ...missing key...))   // h[k]

- A spread is the source value updated by the members after it (one spread per literal, members before it only
  when each is a required field of the source: the source then overwrites it). `Object.assign({}, x)` is x.
- A rest pattern's remainder takes the source's open slots. A conversion between record types, `in` with a literal
  key and every outside call are functions of the whole value, rest included.
- An undeclared key by dot, by literal bracket or by computed key reads the dictionary (a declared name, by a
  computed key, its field); a key written in a literal of the open type is a DictPut on it.
- A dictionary entry written in a value (`(acc[k] = v), acc`, a Record<string, true> accumulator) is DictPut, as the
  statement form: a '__proto__' key with a primitive is ignored, with an object or null refused (prototype).
- The heap core builds a node of the declared fields: a spread of a record the unit did not build (common.mjs
  builtRecord) leaves the core for this reading.

## What stays refused
- `spread-source` (common.mjs spreadReadWhy): two spreads in one literal (the first source's keys the second lacks
  survive), a member before a spread that the source may lack (an optional field: missing and undefined read alike).
- `key-order`: for-in over a value lean did not build. The datatype holds no key order: a literal's order is not in
  its value (two literals built in two orders are one value), so an order read from the value would equate them.
- `dynamic-key`: a write of an undeclared key; a number index alone; a computed `in` where a declared field is
  optional; a union of open records. `prototype`: an undeclared key naming an Object.prototype member.
- `assign-target`: `Object.assign(t, s)` of a record source onto an owned target (the target's rest is not merged).

## Soundness
The rest is equality only: no reading looks inside it. Two JavaScript objects with the same Dafny value hold the same
declared fields, the same undeclared keys and values (MoreBuilt: none; MoreFrom: one name per set), so every reading
that sees the rest (equality, an uninterpreted call, the dictionary) sees them alike. Cases considered: `{ ...s }`
against the fields by hand (not equal: MoreBuilt against s's rest); `{ a: 1, ...s }` on an optional `a` (refused);
`{ ...x, ...y }` (refused); `h[k]` against the same read of a declared-fields copy (the copy's dictionary is empty);
a literal reordered (for-in stays refused off a literal; the value carries no order, so nothing reads one); `__proto__`
as an accumulator key (ignored for a primitive, as Object.prototype's setter does).

## Lint
spread-source (literal block), dynamic-key and prototype through common.mjs openRecordReadWhy (dot, bracket),
openRecordIn narrowed (`in`); escapes spread_source_open, dynamic_key_index_signature (a number index),
dynamic_key_index_signature_dot (`h.constructor`), dynamic_key_index_signature_in (a computed key, optional field).

## Lane B
exec/spec.mjs recordSpec: a plain record draws zero or one extra string entry keyed by a name the unit mentions and
the type does not declare (k0 when none), never an Object.prototype name; the index-signature draw is unchanged.
