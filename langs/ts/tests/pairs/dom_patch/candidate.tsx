/// <reference path="./types.d.ts" />
// A front-end WITNESS printed as a patch: each unit changes its tree by exactly one kind of edit, and the witness
// carries the edit from the parent's tree to the candidate's (langs/ts/patch.mjs).
import { useEffect } from "react";
import { log } from "service";
export function Added() {
  return <ul><li key="a">apples</li><li key="b">pears</li></ul>;
}
export function Dropped() {
  return <ul><li key="a">apples</li></ul>;
}
export function Label() {
  return <p>Hello, world</p>;
}
export function Link() {
  return <a href="/start">home</a>;
}
export function Reorder() {
  return <ol><li key="b">two</li><li key="a">one</li><li key="c">three</li></ol>;
}
// the tree is the same; only what the effect asks of the environment changes: an empty patch that says so
export function Logged() {
  useEffect(() => { log("shown"); }, []);
  return <b>log</b>;
}
export function Untouched() {
  return <span>same</span>;
}
