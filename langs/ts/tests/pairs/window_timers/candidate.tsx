import { useState, useRef, useEffect } from 'react';
import { Panel } from 'ui';
// a held handler arms a browser timer through `window`; the text that differs shows only once the timer fired
export function SaveDone() {
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (done) return <span>Saved.</span>;
  return <Panel onSave={() => { timer.current = window.setTimeout(() => setDone(true), 500); }} />;
}
// the same timer through the bare global: in a browser `window` is the global object
export function SaveAlias() {
  const [done, setDone] = useState(false);
  if (done) return <span>Saved</span>;
  return <Panel onSave={() => { window.setTimeout(() => setDone(true), 500); }} />;
}
// two setters in one handler, then the same two in the other order: React applies them as one batch
export function SaveReset() {
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);
  if (done) return <Panel label={String(count)} onSave={() => { setCount(0); setDone(false); }} />;
  return <Panel label={String(count)} onSave={() => { window.setTimeout(() => { setDone(true); setCount(1); }, 500); }} />;
}
