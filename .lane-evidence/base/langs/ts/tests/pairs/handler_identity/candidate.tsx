/// <reference path="./types.d.ts" />
import { useState } from "react";
import { save } from "service";
type Props = { id: number; count: number; label: string };
export function Row(p: { label: string; select: () => void }) {
  return <li onClick={p.select}>{p.label}</li>;
}
export function Picker(props: Props) {
  const [picked, setPicked] = useState(0);
  const choose = () => { const id = props.id; setPicked(id); save(id); };
  return <Row label={props.label} select={choose} />;
}
export function PickerSetter(props: Props) {
  const [picked, setPicked] = useState(0);
  const [last, setLast] = useState(0);
  return <Row label={props.label} select={() => { setPicked(props.id); setLast(picked); save(props.id); }} />;
}
export function PickerProp(props: Props) {
  const [picked, setPicked] = useState(0);
  return <Row label={props.label} select={() => { setPicked(props.count); save(props.count); }} />;
}
export function PickerBranch(props: Props) {
  const [picked, setPicked] = useState(0);
  return <Row label={props.label} select={() => { if (picked === 0) { setPicked(props.id); } }} />;
}
export function TwoSlots(props: Props) {
  const [picked, setPicked] = useState(0);
  const [last, setLast] = useState(0);
  return <Row label={props.label} select={() => { setLast(picked); setPicked(props.id); save(props.id); }} />;
}
export function Caption(props: Props) {
  return <span>{props.label}</span>;
}
