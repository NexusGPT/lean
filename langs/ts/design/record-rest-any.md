# Record rest of a parameter, any field types (stage 5, rank 2, `record-rest-any`)

## The construct

`function Card({ title, note = "", ...rest }: CardProps) { return <div {...rest}>{title}</div>; }`: an object pattern
with a rest element in a parameter (a component's props, mostly). JavaScript copies every own enumerable property of
the source whose key is not named in the pattern into a fresh object (ECMAScript CopyDataProperties): string and symbol
keys, getters invoked, prototype members left out. The remainder is fresh, but its fields hold the source's references.

## The reading

The remainder is one bodiless function of the source, named by the sorted list of excluded keys and the two Dafny
types: `rest_<keys>_<hash>_to_<T>(source)`. The pair `tests/pairs/record_rest_any` translates Badge to

    var heading := arg0_.title;
    var id := arg0_.id;
    var others := ext_rest_id_title_l9zh7m_to_Rest_1hy53fy_CardProps(arg0_);

A field read of it is a field read (an accessor on an opaque type); a JSX spread is the existing prop merge
`props_of_<T>(rest)`. The exact datatype copy stays for the scalar record without defaults the lint admitted before.
A default of a field of an untyped source (`{ size = 1 }: any`), dropped before, is now `Any_size_or(source, 1)`.

## The lint

`paramRecordRest` (`lint/lint.mjs`, beside `recordRestShape`) admits the rest when the pattern sits in a parameter, the
source is a plain record, an intersection of plain records, or `any` (an unresolved import), and every excluded key
is an identifier or a string literal. Defaults on the other elements are allowed. The rest local joins `aliasLocals`.

## What stays refused

- `record-rest`: a local pattern (unchanged; its key set is a dictionary's when the source is one), a class, accessor,
  symbol-keyed, index-signature or type-parameter source, a computed exclusion. Escapes `fixtures/escapes/ts/
  record_rest_{class,accessor,symbol_key,dictionary_param,type_parameter,computed_key}.ts`.
- `alias-mutation`: a write through the remainder, which shares the source's references (`record_rest_param_write.ts`).

## Soundness

- Equal sources give equal remainders; a changed exclusion list is another function, never proved equal (HasNote).
- A parent `{...rest}` against a candidate listing the fields is not proved equal. That is right: a TypeScript value
  may carry properties its type does not declare (excess properties through a variable), and the rest copies them.
- An untyped source: the function claims nothing about its result. Getters on the source run before the body.
- A large interface (`HTMLAttributes`) stays behind one function, never expanded into a datatype built field by field.
- The identity guard (`translate/heap.mjs`) withholds a lemma whose result carries the remainder (a JSX spread):
  its skeleton reads identifier parameters only. Card and Sized in the pair are withheld, not proved.

## What lane B sees

Real JavaScript on typed props inputs: Card and HasNote are witnessed by an input carrying `note`, Sized by an untyped
input without `size`. Typed inputs carry no excess properties: lane B never exercises the case the opaque reading guards.

## Instances (from `estate-coverage/units.jsonl` and stage5.md; lint and `translate.mjs --core --tolerant` in place)

| instance | enters |
|---|---|
| nexus-learning `packages/ui/src/dialog.tsx:61` `DialogHeader` | yes: 5 units translated, 0 failed, `dafny resolve` exit 0 |
| apps-ui `src/components/ui/accordion.tsx:50` `AccordionContent` | yes: 4 translated, 0 failed, resolve exit 0 |
| claude-skills `src/components/ui/dropdown-menu.tsx:122` `DropdownMenuRadioItem` | yes: 15 translated, 0 failed, resolve exit 0 |
| nexus `apps/frontend/src/common/components/Inputs/TextInput/index.tsx:81` `TextInput` | yes: translated, 0 failed |
| apps-ui `src/blocks/settings/EmptyState.tsx:25` `EmptyState` | no here: `Omit` of the unresolved React type has an index signature; enters with the environment complete |
| apps-ui `demo/src/sections/effects.tsx:58` `GooeyMenu` | no: `Record<\`data-fx${string}\`, ...>` is a dictionary source |
