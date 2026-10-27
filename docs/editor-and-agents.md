# The lint in the editor and in an agent's loop, in full

The lint is the same program that admits a function to the proof lane, so what the editor underlines is exactly what the proof will refuse: the line, the rule, what to write instead. Each rewrite carries a label: `[proved]` (the rewrite is a theorem), `[conditional: <precondition>]` (a theorem under a stated precondition) or `[migration]` (a change of meaning you make on purpose). Every output below is a real run of this checkout on the file shown.

```ts
// quote.ts
export type Line = { sku: string; qty: number; price: number };

export function quote(lines: Line[], plan: any): number {
  let total = 0;
  for (const l of lines) total += l.qty * l.price;
  const seats = plan.seats;
  return plan.tier === "pro" ? total - seats : total;
}

export function rate(nights: number): string {
  return nights > 7 ? "weekly" : nights > 1 ? "nightly" : "single";
}
```

```
$ node langs/ts/lint/lint.mjs quote.ts
quote.ts: inside the subset
```

## Types for every `any`

`--any-type` on the command line, and the `anyType` option of the editor rule, name every `any` at its declaration (a parameter, a local, a field, a bound name, a field of an interface) with the type its uses and its same-file callers need, offered as an annotation to accept or not. A proposed type is a claim about intent, never proved, so it is labelled `conditional` on its evidence, `migration` when the evidence conflicts, or `flag-only` when there is none. `any` inside a type (`any[]`, `Record<string, any>`) is not reported yet.

```
$ node langs/ts/lint/lint.mjs quote.ts --any-type
quote.ts:3:38  any-type  `plan` is any (written); its uses say { seats: number; tier: string }
quote.ts:6:9  any-type  `seats` is any (inferred); its uses say number
2 violation(s)
```

## The rules a reviewer would otherwise type

`--advice` on the command line, `advisory` in the editor rule (on by default there), carries the mechanical rules of code review: a nested ternary to nested `if` (`proved`, with the pair that proves it), `innerHTML` or `document.write` with a non-literal to a `textContent` write (`migration`), `Promise.all` over independent awaits in a loop (`conditional` on the calls commuting in the world), `var` to `let` (`conditional` on no use before the declaration). An advisory finding never refuses a function.

```
$ node langs/ts/lint/lint.mjs quote.ts --advice
quote.ts:11:10  nested-ternary  a branch contains another conditional expression; nested if statements preserve its evaluation order
1 violation(s)
```

## The editor rule

The ESLint plugin ([`../langs/ts/eslint`](../langs/ts/eslint)) ships one rule, `lean/provable`, with the same findings. A rewrite that keeps your meaning is offered as a suggestion where one exists (`===` for `==`, `let` for `var`, `Math.floor` around a division); no finding is an autofix.

```js
// eslint.config.mjs
import lean from 'lean/langs/ts/eslint/index.mjs';
import tsparser from '@typescript-eslint/parser';
export default [{ ...lean.configs.recommended, languageOptions: { parser: tsparser } }];
```

## A work list for a coding agent

`--agent` prints the findings as a work list an agent acts on item by item, in the order that pays (mutations first, then equality and arithmetic), and `--json` carries each finding's `label`, `precondition` and `advice` as fields. On the cart of the README's writing section:

```
$ node langs/ts/lint/lint.mjs usual/cart.ts --agent
# lean: what keeps usual/cart.ts from being proved

2 finding(s) in 1 place(s). Each item is one construct the proof lane refuses; fix the item, rerun `node langs/ts/lint/lint.mjs usual/cart.ts --agent`, and the function is provable when its list is empty.

## addLine

- [ ] line 6, `alias-mutation`: `t` is another name for a value this function was handed; change it through that name, or copy it first
      code: `t.net`
      do: [migration] This name is another name for a value the function was handed; a change through it would not be seen through the other name in the model. Change the parameter itself, or copy first: `const u = { ...user }`. […]
- [ ] line 7, `alias-mutation`: […]

## Order

1. Mutations first (`param-mutation`, `closure-mutation`, `receiver-mutation`, `property-assign`, `index-assign`): they change the shape of the function.
2. Then equality and arithmetic (`reference-equality`, `division`, `loose-equality`): local rewrites.
3. Then anything the project cannot resolve (`ts-strict`, `unresolved-module`, `global-read`): types the proof needs.
4. Rerun `node langs/ts/check.mjs --parent <old> --candidate <new> --unit <name>` and read the verdict, not the lint, as the result.
```

`[…]` marks text cut from this page; the run prints it in full.

## Where the subset stops in a repository

Code written with the lint on is inside the subset from the first line. Code written before it gets lane B and the rule that stopped the proof lane. `census.mjs` counts both over a whole repository, and `--report` writes where the subset stops, grouped by rule and then by directory with one example line each, so an owner sees which habit pays first.
