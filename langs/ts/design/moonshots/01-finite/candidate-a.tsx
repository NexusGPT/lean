import React, { useState } from "react";
// A component whose state is two booleans: a finite machine. Every click order is explorable.
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
