type Owner = { name: string };
type CardProps = { id: string; title: string; tags: string[]; owner: Owner; note?: string };
export function Card({ title, note, ...rest }: CardProps) {
  return (
    <div {...rest}>
      <h2>{title}</h2>
    </div>
  );
}
export function HasNote({ title, note, ...rest }: CardProps): boolean {
  return "note" in rest;
}
export function Badge({ title: heading, id, ...others }: CardProps): string {
  const owner = others.owner.name;
  return `${heading} (${id}) ${owner}`;
}
export function OwnerLine({ id, ...rest }: CardProps) {
  return (
    <p key={id}>
      {rest.owner.name}: {rest.tags.length}
    </p>
  );
}
export function Sized({ size = 2, ...rest }: any) {
  return <i data-size={size} {...rest} />;
}
