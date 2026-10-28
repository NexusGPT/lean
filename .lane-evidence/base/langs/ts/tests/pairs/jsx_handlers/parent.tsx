/// <reference path="./types.d.ts" />
import { useCallback, useEffect, useMemo, useState } from "react";
import * as React from "react";
import { useMemo as remember } from "react";
import { save, log } from "service";
type Props = { id: number; other: number };
export function Rewired(props: Props) {
  return <button onClick={() => save(props.id)}>save</button>;
}
export function CallbackRefactor(props: Props) {
  return <button onClick={() => save(props.id)}>save</button>;
}
export function MemoChanged(props: Props) {
  const n = useMemo(() => props.id + 1, [props.id]);
  return <span>{n}</span>;
}
export function Captured(props: Props) {
  const id = props.id;
  return <button onClick={() => save(id)}>save</button>;
}
export function Ordered(props: Props) {
  return <button onClick={() => { log(); save(props.id); }}>save</button>;
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
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
export function StateRead(props: Props) {
  const [n] = useState(props.id);
  return <span>{n}</span>;
}
export function MemoRefactor(props: Props) {
  const n = useMemo(() => props.id + 1, [props.id]);
  return <span>{n}</span>;
}
export function EffectCapture(props: Props) {
  const id = props.id;
  useEffect(() => { save(id); }, [id]);
  return <span>effect</span>;
}
export function OpaqueHandler(props: Props) {
  const id = props.id;
  return <button onClick={() => { if (id > 0) save(id); }}>save</button>;
}
export function StaleMemo(props: Props) {
  const n = useMemo(() => props.id + 1, []);
  return <span>{n}</span>;
}
export function EffectfulMemo(props: Props) {
  const n = useMemo(() => { save(props.id); return props.id; }, [props.id]);
  return <span>{n}</span>;
}
export function HookAliases(props: Props) {
  const n = remember(() => props.id + 1, [props.id]);
  return <button onClick={() => save(n)}>save</button>;
}
export function PureHandler(props: Props) {
  return <button onClick={() => props.id + 1}>value</button>;
}
