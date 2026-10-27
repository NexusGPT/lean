// README example, front end (candidate): a search box with a debounced filter, a toggle that shows the hits, and a panel whose
// state is finite by its types.
import { useEffect, useState } from "react";

export function Search({ items, limit }: { items: string[]; limit: number }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<string[]>([]);
  useEffect(() => {
    const t = setTimeout(() => setHits(items.filter((x) => x.startsWith(q)).slice(0, limit + 1)), 200);
    return () => clearTimeout(t);
  }, [q, items, limit]);
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
      <button onClick={() => setOpen(!open)}>{open ? "hide" : "show"}</button>
      {open && <ul>{hits.map((h) => <li key={h}>{h}</li>)}</ul>}
    </div>
  );
}

export function Panel({ initial }: { initial: "list" | "map" }) {
  const [view, setView] = useState<"list" | "map">(initial);
  const [pinned, setPinned] = useState(false);
  return (
    <section>
      <button onClick={() => { if (view === "map") setPinned(true); setView(view === "list" ? "map" : "list"); }}>{view}</button>
      <button onClick={() => setPinned(!pinned)}>{pinned ? "pinned" : "free"}</button>
      {view === "map" && pinned && <p>pinned map</p>}
    </section>
  );
}
