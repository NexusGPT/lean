// expect: inner-html migration
export function content(element: { innerHTML: string; outerHTML: string }, value: string): void {
  element.innerHTML = value;
  element.outerHTML = value;
  element['innerHTML'] = value;
  element['outerHTML'] = value;
}
