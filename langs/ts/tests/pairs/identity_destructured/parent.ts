// the identity guard reads destructured and rest parameters (design/heap-stage5.md, section 0b): a field bound at any
// depth of a parameter's object pattern is the input path to it, a record rest a fresh node of its source's members
// less the keys named beside it, a rest parameter a fresh array of the arguments from its place on; a binding with a
// default, an element of an array pattern, or a binding the unit writes again keeps no term
type Tag = { label: string };
type Inner = { tag: Tag; note: string };
type Q = { inner: Inner; id: string };

export function innerTag({ inner: { tag } }: Q) {
  return tag;
}

export function innerRest({ inner: { note, ...others } }: Q) {
  return others;
}

export function renamed({ inner: { tag: t } }: Q) {
  return { t };
}

export function copied(...all: Tag[]) {
  return all;
}

export function lead(head: Tag, ...more: Tag[]) {
  return { head, more };
}

export function twice(...all: Tag[]) {
  return [all, all];
}

export function fallback({ tag = { label: "none" } }: { tag?: Tag }) {
  return tag;
}

export function paired([first]: Tag[]) {
  return { a: first, b: first };
}

export function stamp({ inner: { tag } }: Q) {
  tag.label = "x";
  return 1;
}
