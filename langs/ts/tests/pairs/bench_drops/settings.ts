// a module of this package reached through the project's own `@/` alias; its top level reads a host global the
// sandbox does not give (a browser's document: lean has no DOM beyond the finite lane's), so loading it for real fails
const host = globalThis as unknown as { document: { cookie: string; title: string } };
export const prefix: string = host.document.cookie ?? '';
export function notify(message: string): void {
  host.document.title = message;
}
// a helper of this module that wraps notify: a unit may call it, or inline its body
export function announce(code: number): void {
  notify(code > 3 ? 'high' : 'low');
}
