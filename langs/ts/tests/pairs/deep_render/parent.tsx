// Deep render (moonshot 7): a page's verdict decided on the composed tree, not a tree of names.
export function Child(props: { text: string }) {
  return <span className="child">{props.text}</span>;
}
export function Page(props: { title: string }) {
  return (
    <main>
      <h1>{props.title}</h1>
      <Child text="hello" />
    </main>
  );
}
