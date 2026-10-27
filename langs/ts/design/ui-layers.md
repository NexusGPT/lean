# The layered UI certificate: the tree with context to a stated depth, then resolved styles

The construct: a rendered unit whose children read a React context (`createContext`, `<Ctx.Provider value>`,
`useContext(Ctx)`), and whose elements carry a `className` of Tailwind utility classes.

JavaScript's meaning. React renders an element's component after its owner returned, top down, where the element is
placed; `useContext(C)` returns the `value` of the nearest `C` provider above that place, else the default (React's
`readContext` over the fiber tree). A class attribute's order never counts in CSS: the stylesheet's own order decides
which of two rules on one property wins, and Tailwind emits one rule per utility from its configuration.

## Layer 1, the tree (lane B, `exec/run.mjs`; `check.mjs --deep[=k]`)
`--deep=k` renders same-package function components k levels down (`--deep` is k = 1, the earlier mode; no flag is the
tree of names). The walk is lazy, as React's: the jsx runtime only records each element's type (a hidden `$type`); after
the unit returns, `deepExpand` walks the tree top down with a context stack. A provider element pushes its `value` for
its children; a component under depth k is called on its own hook frame keyed by its place (owner frame, then order:
`Frame#1>Label#1`), and its output is walked in turn; a component at depth k, and a package component (a fake), stays a
handle (name and props). `createContext` is now React's own object in the hook runtime, so a provider is recognised by
identity. `useContext` reads the nearest provider of that context on the stack; with none (and always at the unit's
root) it reads the outside value, one fake per context, the same at every frame and render. The hook table carries the
reading as the `useContext` row (`translate/hooks.json`, `hooks.mjs contextRow`), whose text is the certificate's
assumption. Lane A reads the same call through that row as a world read keyed by the context, one function per result
type (`translate.mjs`, the hook-table read only):

```
var (wld, t0_) := ext_hook_useContext_string_World_Any(wld, ext_Any_of_Context_Context(ext_Theme()));
var theme: string := t0_;
```

Since every unit is proved alone, the provider of a root is outside it; a child stays a name in lane A. Made true
along the way: the one-render observation now reads a rendered tree to its last element (`renderTree`:
render's six-level bound restarts at each element; before, a fourth nested element's props and children were cut to
`$deep`); the command sequences and the finite lane walk a deep child's output (its handlers fire, its slots are state
in the finite key); the double render restores the children's frames too.

## Layer 2, resolved styles (`exec/styles.mjs`)
Every input both sides rendered is projected to its styled elements in pre-order (an element with a `className`), and
each pair of class strings is compared: the same token set is equal under any configuration; otherwise both are
resolved against the pinned table (Tailwind CSS v3.4 default theme: spacing, sizing, display, position, flex, grid,
type, five colour palettes, borders, radius, shadow, opacity, overflow and a few more; 20 single variants) into
declarations per variant, longhands for shorthands (`p-4` is four paddings, so `px-4 py-4` is equal). Different
declarations at one position are a styles WITNESS with both declaration maps. An unknown class, a stacked or unknown
variant, an important mark, an opacity modifier or two classes writing one property with different values make that
element `unknown` (`unsupported` lists them): never equal, never a WITNESS. The run keeps going past the tree layer's
third witness so the styles layer reads all n inputs (no recording, a harness stop ends it). The certificate (`check.mjs`): `certificate.layers = { tree: {verdict, depth, rendered, handles, contexts,
assumptions, proof}, styles: {verdict, inputs, elementsCompared, unsupported, config, assumptions}, notObserved }`.
The unit's verdict stays the tree layer's (lane B's rung, then lane A); the styles layer never lowers or raises it.

## What stays out, and soundness
Out, named in `notObserved`: pixels, layout, the committed DOM, the accessibility tree, styles beyond the pinned
utilities. A project's own Tailwind configuration (theme extensions, a v4 `@theme` block) is not read: its classes are
unknown, and a pinned class it overrides is an assumption the styles layer states. A rendered child's effects run once
with the mount; the sequences re-run the unit's own effects only (as before this lane).

Soundness. No reading proves: both layers are lane B, PASS-bounded at most. A wrong context would make a child read a
value it never reads; the walk keeps React's order, and an outside read is one value for both sides. A false styles
equality needs two class strings with different declarations to map to one map: the token rule is configuration-free,
a resolved map never drops a property (a conflict is unknown), and the table checks that no two colour names share a
value, so a transcription slip turns one difference into another, never into equality. Lane A's useContext reading is
a world read on both sides; a changed context type is a different function, never equal. No lint rule changed.

Pairs: `ui_tree_context` (App's provider carries a function whose captured step changed: PASS-bounded as names, a
WITNESS with `--deep` after one click, PASS-bounded under the earlier deep render; Shell proved; Board renders Label
under Frame's provider at depth 2, a handle at depth 1) and `ui_styles` (Badge a styles WITNESS, Card's reordering and
Box's longhands equal in the styles layer, Chip unknown, Tag proved).

## Measured (`node langs/ts/design/ui-layers-census.mjs <nexus tree> <langchainjs>`, 2026-10-27)
| root | .tsx | front-end units | render a same-package component | useContext | provider | units with literal className | class tokens resolved | literals fully resolved |
|---|---|---|---|---|---|---|---|---|
| nexus tree | 2,651 | 2,404 | 1,485 | 4 | 52 | 1,675 (16,972 literals) | 51,777 of 68,900 | 7,570 of 16,972 |
| langchainjs | 3 | 3 | 0 | 0 | 0 | 0 | 0 of 0 | 0 |

Unresolved tokens are mostly the project's own theme (`text-nx-text-*` 4,518, `rounded-nx-*` 2,611,
`border-nx-stroke-*` 1,356), a configuration lean does not read. Instances read (nexus tree):
`tools/mission-control/web/src/contexts/EnvContext.tsx:18` (provider of state and a toggle, the App shape: enters),
`:23` (read inside a custom hook, which runs on the caller's frame: enters), `apps/frontend/src/common/contexts/DevModeContext.tsx:56`
(enters), `apps/frontend/src/contexts/DocumentCacheContext.tsx:246` (provider value from a memo: enters),
`tools/nexus-studio/web/src/components/Layout.tsx:77` (`flex items-center gap-2`: resolved),
`packages/shared/src/modules/chat/components/message/HtmlTemplateMessage.tsx:55` (`nx-html-template ...`: unknown).
