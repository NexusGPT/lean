/// <reference path="./types.d.ts" />
import { makeApi } from "api";
type Item = { id: number; label: string };
export function Row(p: { label: string; select: () => void }) {
  return <li onClick={p.select}>{p.label}</li>;
}
// a value from an outside call that is no hook, its mutating method called by the held handler: no capture kind
// carries it, so the lint refuses the unit and lane B keys the handler by its text
export function Unknown(props: Item) {
  const api = makeApi();
  return <Row label={props.label} select={() => api.push(1)} />;
}
