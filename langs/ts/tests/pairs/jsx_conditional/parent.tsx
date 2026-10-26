export function Badge(props: { n: number; label: string }) {
  return <span className="badge">{props.n > 0 ? <b>{props.label}</b> : null}</span>;
}
