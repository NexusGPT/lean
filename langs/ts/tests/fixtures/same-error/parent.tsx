/// <reference path="./types.d.ts" />
import { useState } from "react";
import * as React from "react";
// Components whose handlers reach a global the sandbox does not hold (design/microtask-worker.md, 2026-10-30).

// every handler throws the same ReferenceError on both sides before it sets anything: the candidate's change after the
// throw is never run, so an explored run that reads PASS-decided would take the sandbox gap for an observation
export function Copier({ label }: { label: "a" | "b" }) {
  const [done, setDone] = useState(false);
  return <button onClick={() => { missingClipboard.write(label); setDone(true); }}>{done ? "copied" : label}</button>;
}

// one handler throws, the other runs: the exploration observes something, so its verdict stands
export function Partial({ label }: { label: "a" | "b" }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => { missingClipboard.write(label); }}>copy</button>
      <button onClick={() => setOpen(!open)}>{open ? "close" : "open"}</button>
    </div>
  );
}

// no handler throws: untouched
export function Toggle({ label }: { label: "a" | "b" }) {
  const [open, setOpen] = useState(false);
  return <button onClick={() => setOpen(!open)}>{label}{open ? "!" : ""}</button>;
}
