/// <reference path="./types.d.ts" />
// Resolved styles (design/ui-layers.md): a className string read as the declarations of its utility classes under the
// pinned Tailwind configuration, beside the element tree that reads it as text.
export function Badge(props: { label: string }) {
  return <span className="px-2 py-1 text-sm font-medium">{props.label}</span>;
}
export function Card(props: { title: string }) {
  return (
    <div className="rounded-lg p-4 shadow bg-white">
      <h2 className="text-lg font-semibold">{props.title}</h2>
    </div>
  );
}
export function Box(props: { text: string }) {
  return <p className="p-4 text-gray-700">{props.text}</p>;
}
export function Chip(props: { name: string }) {
  return <span className="chip-primary px-2">{props.name}</span>;
}
export function Tag(props: { on: boolean; text: string }) {
  return <em className={"px-2 " + (props.on ? "font-bold" : "font-normal")}>{props.text}</em>;
}
export function Plain(props: { text: string }) {
  return <div className="flex items-center gap-2">{props.text}</div>;
}
