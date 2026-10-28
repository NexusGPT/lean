/// <reference path="./types.d.ts" />
import { useRef, useState } from "react";
import { useRouter } from "next/router";
import { save } from "service";
type Item = { id: number; label: string };
export function Row(p: { label: string; select: () => void }) {
  return <li onClick={p.select}>{p.label}</li>;
}
// a hook result whose method is a request: the click asks the router for another path
export function Nav() {
  const router = useRouter();
  return <button onClick={() => router.push("/a")}>go</button>;
}
// two pure render consts in another order; the held handler captures the router and a nested prop
export function NavReorder({ item: { id, label } }: { item: Item }) {
  const router = useRouter();
  const path = `/items/${id}`;
  const shown = `#${label}`;
  return <Row label={shown} select={() => router.push(path)} />;
}
// a ref cell the held handler reads: another initial value is another cell content
export function CellInit(props: Item) {
  const seen = useRef(0);
  return <Row label={props.label} select={() => save(seen.current)} />;
}
// a fired handler reading a ref cell and a nested prop into a slot: the interpreter predicts the slot
export function Tally({ item: { id } }: { item: Item }) {
  const [total, setTotal] = useState(0);
  const base = useRef(10);
  return <button onClick={() => setTotal(base.current + id)}>{total}</button>;
}
