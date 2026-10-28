import { useEffect, useState } from "react";
// The schedule explorer (moonshot 9): the clock is a command between handlers, and the timers due at one instant
// fire in every order, so a delay change and an order-dependent timer are observed.
export function SearchBox(props: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState("");
  useEffect(() => {
    const id = setTimeout(() => props.onSearch(q), 0);
    return () => clearTimeout(id);
  }, [q]);
  return <input value={q} onChange={(e: { target: { value: string } }) => setQ(e.target.value)} />;
}
// two timers due at one instant; the candidate's view keeps whichever fired first
export function Order(props: { onTick: (n: number) => void }) {
  const [n, setN] = useState(0);
  const [first, setFirst] = useState("");
  useEffect(() => {
    const a = setTimeout(() => { props.onTick(1); setFirst((f) => f || "x"); }, 100);
    const b = setTimeout(() => { props.onTick(2); setFirst((f) => f || "y"); }, 100);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [n]);
  return <button onClick={() => setN(n + 1)}>{n}{first}</button>;
}
// two timers of equal delay, the same on both sides: every order agrees
export function Twin(props: { onTick: (n: number) => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const a = setTimeout(() => props.onTick(n + 1), 100);
    const b = setTimeout(() => props.onTick(n + 2), 100);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [n]);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
