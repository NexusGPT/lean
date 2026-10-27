/// <reference path="./types.d.ts" />
import { useState } from "react";
import * as React from "react";
// Components read as functions of their props and their hook slots: lane A proves the render equal for every slot
// value, every handler's next slot value equal, and the initial slots equal; by induction every click sequence is equal.
export function Counter({ start }: { start: number }) {
  const [n, setN] = useState(start);
  return <button onClick={() => setN(1 + n)}>{n}</button>;
}
export function Mutant({ start }: { start: number }) {
  const [n, setN] = useState(start);
  return <button onClick={() => setN(n + 2)}>{n}</button>;
}
export function Updater({ start }: { start: number }) {
  const [n, setN] = useState(start);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
export function Lazy({ start }: { start: number }) {
  const [n, setN] = useState(start * 2);
  return <button onClick={() => setN(n - 1)}>{n}</button>;
}
export function Layout({ start }: { start: number }) {
  const [n, setN] = useState(start);
  const [open] = useState(false);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
