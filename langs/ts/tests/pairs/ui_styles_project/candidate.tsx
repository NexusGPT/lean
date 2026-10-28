/// <reference path="./types.d.ts" />
// Resolved styles under the project's own Tailwind v3 configuration (tailwind.config.js beside this file): its brand
// colours and its spacing step are utilities the styles layer reads, beside the pinned table.
export function Banner(props: { title: string }) {
  return <header className="bg-brand-600 p-18 text-white">{props.title}</header>;
}
export function Panel(props: { body: string }) {
  return <section className="px-18 py-18 text-[#1f6feb]">{props.body}</section>;
}
export function Pill(props: { name: string }) {
  return <span className="bg-brand-900 px-3">{props.name}</span>;
}
export function Plain(props: { text: string }) {
  return <div className="bg-brand-600 p-18 rounded-lg">{props.text}</div>;
}
