import { useState } from "react";
export function Panel(props: { start: number; title: string }) {
  const [n, setN] = useState(props.start);
  return (
    <div role="group" aria-label={props.title}>
      <button id="inc" data-testid="inc-button" role="button" aria-label="increment" onClick={() => setN(1 + n)}>{n}</button>
      {n > props.start ? <span key="more" data-testid="reset" onMouseEnter={() => setN(props.start)}>reset</span> : null}
    </div>
  );
}
export function total(xs: number[]): number {
  let s = 0;
  for (const x of xs) s = x + s;
  return s;
}
export function Toggle(props: { start: number }) {
  const [on, setOn] = useState(props.start > 1000000);
  return <button data-testid="toggle" onClick={() => setOn(!on)}>{on ? "ON" : "off"}</button>;
}
