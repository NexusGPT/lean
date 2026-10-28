/// <reference path="./types.d.ts" />
import { useRef } from "react";
import { makeApi } from "api";
import { save } from "service";
type Item = { id: number; label: string };
export function Row(p: { label: string; select: () => void }) {
  return <li onClick={p.select}>{p.label}</li>;
}
// a value from an outside call that is no hook, its mutating method called by the held handler: no capture kind
// carries it, so the lint refuses the unit and lane B keys the handler by its text
export function Unknown(props: Item) {
  const api = makeApi();
  return <Row label={props.label} select={() => api.push(2)} />;
}
// a ref cell written by one handler and read by another: the capture is carried, the write is named closure-mutation
export function WriteRead(props: Item) {
  const last = useRef(0);
  return (
    <div>
      <button onClick={() => {}}>mark</button>
      <button onClick={() => save(last.current)}>send</button>
    </div>
  );
}
// the same two handlers, the label read before the cell in the render
export function WriteReorder(props: Item) {
  const shown = `#${props.label}`;
  const last = useRef(0);
  return (
    <div>
      <button onClick={() => { last.current = props.id; }}>{shown}</button>
      <button onClick={() => save(last.current)}>send</button>
    </div>
  );
}
