import { useState } from "react";
type Item = { id: string; label: string; done: boolean };
export function ItemList(props: { items: readonly Item[]; title?: string; onPick: (id: string) => void }) {
  const open = props.items.filter((i) => !i.done);
  return (
    <section className="list">
      {props.title ? <h2>{props.title}</h2> : null}
      <ul>
        {open.map((i) => (
          <li key={i.id} onClick={() => props.onPick(i.id)}>
            {i.label}
          </li>
        ))}
      </ul>
      {open.length === 0 && <p>All done</p>}
      <footer>{open.length} open</footer>
    </section>
  );
}
export function Counter(props: { start: number }) {
  const [n, setN] = useState(props.start);
  return <button onClick={() => setN(n + 1)}>count: {n}</button>;
}
