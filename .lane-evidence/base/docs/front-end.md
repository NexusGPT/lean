# The front end, in full

The README shows one component and its witness. This page keeps the machine, the finite lane, the proof over hook slots, the deeper tree and the styles layer. Every output below is a real run of this checkout (paths are under `langs/ts/tests/pairs/`; the styles lines are read from each certificate's `layers`); the components live in [`../langs/ts/tests/pairs/`](../langs/ts/tests/pairs/) (`readme_search`, `hook_slots`, `ui_tree_context`, `ui_styles`, `ui_styles_project`).

<p align="center"><img src="component.svg" width="100%" alt="A React component as a machine: props and hook slots in, a tree out, one step per command"></p>

**A component is a machine.** Its state is the hook slots in call order plus the props; a command is a fired handler, a settle of the effects, a tick of the clock or an unmount; its output after each command is the element tree, the effect and request trace, and the pending work. lean decides at the element-tree layer and says so in every front-end certificate (`observation.layer`, what was rendered, what was not observed). A `WITNESS` is printed as the patch from the parent's tree to the candidate's.

## A component finite by its types

```tsx
export function Panel({ initial }: { initial: "list" | "map" }) {
  const [view, setView] = useState<"list" | "map">(initial);
  const [pinned, setPinned] = useState(false);
  return (
    <section>
      <button onClick={() => { setView(view === "list" ? "map" : "list"); if (view === "map") setPinned(true); }}>{view}</button>
      <button onClick={() => setPinned(!pinned)}>{pinned ? "pinned" : "free"}</button>
      {view === "map" && pinned && <p>pinned map</p>}
    </section>
  );
}
```

The candidate's `Panel` reorders the two setter calls inside the first handler. The proof lane cannot read a handler with a branch, so lane A says `ASK:identity`. The state is a two-literal prop, a two-literal slot and a boolean slot: finite by its types. The finite lane steps both versions together over every click order from every prop value:

```
$ node langs/ts/check.mjs --parent readme_search/parent.tsx --candidate readme_search/candidate.tsx --unit Panel --no-project --n 60 --dafny-seconds 30
PASS-decided   renders: "every click order from every prop assignment, decided: 8 state pairs over 2 assignment(s); effects and armed timers inside each step; a function or element prop is one opaque input; handler descriptors agreed on 32 of 64 fired"
               finite: { slots: [2, 2], props: ["initial:2"], assignments: 2 }
```

## A handler the proof lane reads

A counter whose handler the proof lane can read (`setN(n + 1)` against `setN(1 + n)`) gets `PASS-proved` over its hook slots: one lemma, equal props and slots give an equal tree and an equal next slot.

```
$ node langs/ts/check.mjs --parent hook_slots/parent.tsx --candidate hook_slots/candidate.tsx --unit Counter --no-project --n 30 --dafny-seconds 30
PASS-proved   lanes.A: { lemmas: { Equal_counter: true }, dafny: "1 verified, 0 errors" }
```

## Two more layers, each with its own verdict

A child component is a name in the parent's tree with its props. Under `--deep=k` the tree layer renders same-package children to depth *k*, top down where their elements are placed, and each `useContext` reads the nearest provider above it; a parent whose child reads a changed provider value is a `WITNESS` at depth 1 that the one-level render missed:

```
$ node langs/ts/check.mjs --parent ui_tree_context/parent.tsx --candidate ui_tree_context/candidate.tsx --unit App --no-project --n 30 --dafny-seconds 30 --deep
WITNESS -> app-deep.json
patch: 1 text, 1 attribute
  (root) attribute value: {"bump":{"$fn":"bump","src":"168433ac075c"},"count":1} to {"bump":{"$fn":"bump","src":"168433ac075c"},"count":2}
  C[0]/rendered/button[0] text "1" to "2"
layers.tree: { verdict: "WITNESS", depth: 1, rendered: [{ component: "Bump", depth: 1 }],
               contexts: [{ frame: "Bump#1", context: "context#2", from: "provider" }] }
```

The styles layer reads a `className` as the declarations of its classes under a pinned Tailwind table and the project's own theme, so `text-sm` to `text-base` is a styles `WITNESS` (another font size and line height), a reordering of the same classes is equal in the styles layer while the tree layer still reports the attribute's text, and a class outside the table is reported `unknown`, never equal and never a witness:

```
Badge   layers.styles: WITNESS        parent: { "font-size": "0.875rem", "line-height": "1.25rem", … }   candidate: { "font-size": "1rem", "line-height": "1.5rem", … }
Card    layers.styles: PASS-bounded   inputs: 30, elementsCompared: 60   (layers.tree: WITNESS, the attribute's text changed)
```

Each side's own Tailwind theme is read over the pinned table: a v3 `tailwind.config` (parsed as a literal, never run) or a v4 `@theme` block in the CSS the entry imports, and the certificate names the configuration it read with its path and hash. A theme token changed to another is a styles `WITNESS` with both declarations; a theme key lean does not read, or a config whose top level runs code, leaves its classes `unknown` and says why:

```
Banner  layers.styles: WITNESS   bg-brand-500 → bg-brand-600   parent: { "background-color": "#1f6feb", … }   candidate: { "background-color": "#1158c7", … }
        config: { form: "v3-config", path: ".../ui_styles_project/tailwind.config.js", sha256: "86a2d889fa46906f", tokens: 3 }
```

Pixels, layout and the accessibility tree need a browser; no proof exists for them in any field lean reads, so lean never claims one.
