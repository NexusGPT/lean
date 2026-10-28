type Owner = { name: string };
type CardProps = { id: string; title: string; tags: string[]; owner: Owner; note?: string };
export function Card({ title, ...rest }: CardProps) {
  return (
    <div {...rest}>
      <h2>{title}</h2>
    </div>
  );
}
export function HasNote({ title, ...rest }: CardProps): boolean {
  return "note" in rest;
}
export function Badge({ id, title, ...rest }: CardProps): string {
  return title + " (" + id + ") " + rest.owner.name;
}
export function OwnerLine({ id, ...rest }: CardProps) {
  return (
    <p key={id}>
      {rest.owner.name}: {rest.tags.length}
    </p>
  );
}
export function Sized({ size = 1, ...rest }: any) {
  return <i data-size={size} {...rest} />;
}
