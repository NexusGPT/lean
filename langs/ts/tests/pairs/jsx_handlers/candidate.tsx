/// <reference path="./types.d.ts" />
import { useCallback, useEffect, useMemo, useState } from "react";
import * as React from "react";
import { useMemo as remember } from "react";
import { save, log } from "service";
type Props = { id: number; other: number };
export function Rewired(props: Props) {
  return <button onClick={() => save(props.other)}>save</button>;
}
export function CallbackRefactor(props: Props) {
  const handler = useCallback(() => save(props.id), [props.id]);
  return <button onClick={handler}>save</button>;
}
export function MemoChanged(props: Props) {
  const n = useMemo(() => props.id + 2, [props.id]);
  return <span>{n}</span>;
}
export function Captured(props: Props) {
  const id = props.other;
  return <button onClick={() => save(id)}>save</button>;
}
export function Ordered(props: Props) {
  return <button onClick={() => { save(props.id); log(); }}>save</button>;
}
export function Counter(props: Props) {
  const [n, setN] = useState(props.id);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
export function Effect(props: Props) {
  useEffect(() => { save(props.id); }, [props.id]);
  return <span>{props.id}</span>;
}
export function Untouched(props: Props) {
  return <span>{props.id}</span>;
}
export function SetterChanged(props: Props) {
  const [n, setN] = useState(props.id);
  return <button onClick={() => setN(n + 2)}>{n}</button>;
}
export function StateRead(props: Props) {
  const [n] = useState(props.id);
  return <span>{n + 1}</span>;
}
export function MemoRefactor(props: Props) {
  const n = props.id + 1;
  return <span>{n}</span>;
}
export function EffectCapture(props: Props) {
  const id = props.other;
  useEffect(() => { save(id); }, [id]);
  return <span>effect</span>;
}
export function OpaqueHandler(props: Props) {
  const id = props.other;
  return <button onClick={() => { if (id > 0) save(id); }}>save</button>;
}
export function StaleMemo(props: Props) {
  const n = props.id + 1;
  return <span>{n}</span>;
}
export function EffectfulMemo(props: Props) {
  const n = useMemo(() => { save(props.other); return props.id; }, [props.id]);
  return <span>{n}</span>;
}
export function HookAliases(props: Props) {
  const n = props.id + 1;
  const handler = React.useCallback(() => save(n), [n]);
  return <button onClick={handler}>save</button>;
}
export function PureHandler(props: Props) {
  return <button onClick={() => props.id + 2}>value</button>;
}
