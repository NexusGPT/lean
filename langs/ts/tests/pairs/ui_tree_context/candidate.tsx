/// <reference path="./types.d.ts" />
import { useContext, useState } from "react";
import { Theme, Count } from "./contexts";
// Tree with context (design/ui-layers.md): with --deep=k a same-package child renders where its element is placed and
// each useContext reads the nearest provider element above it.
export function Label(props: { text: string }) {
  const theme = useContext(Theme);
  return <span className={theme === "dark" ? "text-white" : "text-black"}>{props.text}</span>;
}
export function Bump() {
  const ctx = useContext(Count);
  return <button onClick={ctx.bump}>{ctx.count}</button>;
}
export function App() {
  const [count, setCount] = useState(0);
  const step = 2;
  return (
    <Count.Provider value={{ count, bump: () => setCount(count + step) }}>
      <Bump />
    </Count.Provider>
  );
}
export function Shell(props: { dark: boolean; title: string }) {
  const mode = props.dark ? "dark" : "light";
  return (
    <Theme.Provider value={mode}>
      <h1>{props.title}</h1>
      <Label text={props.title} />
    </Theme.Provider>
  );
}
export function Frame(props: { dark: boolean; children: unknown }) {
  return (
    <Theme.Provider value={props.dark ? "dark" : "light"}>
      <section>{props.children}</section>
    </Theme.Provider>
  );
}
export function Board(props: { dark: boolean }) {
  return (
    <Frame dark={props.dark}>
      <Label text="board" />
    </Frame>
  );
}
