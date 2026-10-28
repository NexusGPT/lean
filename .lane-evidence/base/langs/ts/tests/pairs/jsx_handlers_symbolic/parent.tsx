/// <reference path="./types.d.ts" />
import { useState } from "react";
type Props = { step: number };
export function TextInput() {
  const [text, setText] = useState("");
  return <input value={text} onChange={(e) => setText(e.target.value)} />;
}
export function TextInputLocal() {
  const [text, setText] = useState("");
  return <input value={text} onChange={(e) => setText(e.target.value)} />;
}
export function Form() {
  const [sent, setSent] = useState(false);
  return <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>{sent ? "sent" : "draft"}</form>;
}
export function TwoSets(props: Props) {
  const [count, setCount] = useState(0);
  const [last, setLast] = useState(0);
  return <button onClick={() => { const next = count + props.step; setCount(next); setLast(next - 1); }}>{count}:{last}</button>;
}
export function TwoSetsSwapped(props: Props) {
  const [count, setCount] = useState(0);
  const [last, setLast] = useState(0);
  return <button onClick={() => { const next = count + props.step; setCount(next); setLast(next - 1); }}>{count}:{last}</button>;
}
export function Toggle() {
  const [on, setOn] = useState(false);
  return <button onClick={(e) => { e.preventDefault(); setOn(!on); }}>{on ? "on" : "off"}</button>;
}
export function Caption(props: Props) {
  return <span>{props.step}</span>;
}
