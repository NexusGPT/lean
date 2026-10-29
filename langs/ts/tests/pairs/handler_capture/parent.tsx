/// <reference path="./types.d.ts" />
import { useCallback, useEffect, useRef, useState } from "react";
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
// a handler writes a ref cell and a second handler reads it: the candidate drops the write (the second click saves another value)
export function WriteRead(props: Item) {
  const last = useRef(0);
  return (
    <div>
      <button onClick={() => { last.current = props.id; }}>mark</button>
      <button onClick={() => save(last.current)}>send</button>
    </div>
  );
}
// two cell writes in another order leave the same cells
export function WriteReorder(props: Item) {
  const id = useRef(0);
  const label = useRef("");
  return <button onClick={() => { id.current = props.id; label.current = props.label; }}>{props.label}</button>;
}
// an effect writes the cell a handler reads, untouched
export function EffectWrite(props: Item) {
  const seen = useRef(0);
  useEffect(() => { seen.current = props.id; }, [props.id]);
  return <button onClick={() => save(seen.current)}>send</button>;
}
// a write moved past a write of another cell whose value reads the first: the second cell takes the old content
export function ChainReorder(props: Item) {
  const a = useRef(0);
  const b = useRef(0);
  return (
    <div>
      <button onClick={() => { a.current = props.id; b.current = a.current; }}>mark</button>
      <button onClick={() => save(b.current)}>send</button>
    </div>
  );
}
// a handler useCallback holds writes two cells, in another order on the candidate
export function HeldReorder(props: Item) {
  const a = useRef(0);
  const b = useRef("");
  const mark = useCallback(() => { a.current = props.id; b.current = props.label; }, [props.id, props.label]);
  return <button onClick={mark}>{props.label}</button>;
}
// the written value changed: the cell holds another number when the second handler reads it
export function WriteValue(props: Item) {
  const last = useRef(0);
  return (
    <div>
      <button onClick={() => { last.current = props.id; }}>mark</button>
      <button onClick={() => save(last.current)}>send</button>
    </div>
  );
}
