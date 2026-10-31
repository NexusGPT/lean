import { useEffect, useState } from "react";
// a desktop app's preload bridge: the host sets window.api, lean's sandbox does not
declare global {
  interface Window {
    api: { userName(): Promise<string>; onThemeChange(cb: (theme: string) => void): void; status(): Promise<string> };
  }
}
// awaits a bridge call, then renders what it answered
export function Greeting(props: { prefix: string }) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => { window.api.userName().then((n) => setName(n)); }, []);
  if (name === null) return null;
  return <h1 data-testid="greeting">{props.prefix}{name}</h1>;
}
// registers a callback with the bridge, renders once it is called
export function Theme(props: { label: string }) {
  const [theme, setTheme] = useState<string | null>(null);
  useEffect(() => { window.api.onThemeChange((t) => setTheme(t)); }, []);
  if (theme === null) return null;
  return <main data-testid="theme" title={props.label}>{theme}</main>;
}
// renders the bridge's answer after an await; the candidate renders a constant instead
export function Status(props: { id: number }) {
  const [s, setS] = useState<string | null>(null);
  useEffect(() => { (async () => { const v = await window.api.status(); setS(v); })(); }, []);
  if (s === null) return null;
  return <p data-id={props.id}>{"online"}</p>;
}
