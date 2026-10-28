/// <reference path="./types.d.ts" />
// Resolved styles under the project's own Tailwind v4 theme (theme.css beside this file, an @theme block): a token is a
// utility that reads its variable, as v4 emits it.
export function Banner(props: { title: string }) {
  return <header className="bg-brand-500 p-18 text-white">{props.title}</header>;
}
export function Panel(props: { body: string }) {
  return <section className="bg-brand-500 p-18">{props.body}</section>;
}
export function Pill(props: { name: string }) {
  return <span className="bg-brand-900 px-2">{props.name}</span>;
}
export function Plain(props: { text: string }) {
  return <div className="bg-brand-600 p-18 rounded-lg">{props.text}</div>;
}
