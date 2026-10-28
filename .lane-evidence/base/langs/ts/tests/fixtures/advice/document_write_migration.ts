// expect: inner-html migration
export function page(value: string): void {
  document.write(value);
  document['write']('plain text');
}
