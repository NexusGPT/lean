// step 0, third measurement defect: a destructured parameter's field is the path arg.field and a rest is a fresh
// object of the input's members, so a component that forwards its rest has a readable identity shape
type P = { title: string; tone: string; id: string };

export function Card({ title, ...rest }: P) {
  const t = title;
  return <div {...rest}>{t}</div>;
}

export function Badge({ title, ...rest }: P) {
  return <span {...rest} tone="flat">{title}</span>;
}

export function Plain({ title }: P) {
  return <b>{title}</b>;
}
