/// <reference path="./types.d.ts" />
import { useState, useEffect } from "react";
import * as React from "react";
import { log } from "service";
// A component whose state and props are finite is a machine: lane B explores every click order from every prop
// assignment and decides (rung 2 of the certificate); lane A proves what it can read (rung 1); the rest is bounded.
export function Toggle({ initial }: { initial: boolean }) {
  const [open, setOpen] = useState(initial);
  const [pinned, setPinned] = useState(false);
  return (
    <div>
      <button onClick={() => { if (!open) setPinned(true); setOpen(!open); }}>{open ? "close" : "open"}</button>
      <button onClick={() => setPinned(!pinned)}>{pinned ? "pinned" : "free"}</button>
      {open && pinned && <p>both</p>}
    </div>
  );
}
export function Tabs({ variant }: { variant: "a" | "b" }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (open) { log(); } }, [open]);
  return <button onClick={() => setOpen(open ? false : true)}>{variant}{open ? "!" : ""}</button>;
}
export function Mutant({ initial }: { initial: boolean }) {
  const [open, setOpen] = useState(initial);
  const [pinned, setPinned] = useState(false);
  return (
    <div>
      <button onClick={() => { setOpen(!open); if (!open) setPinned(true); }}>{open ? "close" : "open"}</button>
      <button onClick={() => setPinned(true)}>{pinned ? "pinned" : "free"}</button>
      {open && pinned && <p>both</p>}
    </div>
  );
}
export function Named({ start }: { start: string }) {
  const [name, setName] = useState(start);
  return <button onClick={() => setName(name + "?")}>{name}</button>;
}
