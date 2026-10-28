// a module of this package reached through the project's own `@/` alias; its top level reads a host global the
// sandbox does not give (a browser's localStorage), so loading it for real fails
const host = globalThis as unknown as { localStorage: { getItem(key: string): string | null } };
export const prefix: string = host.localStorage.getItem('prefix') ?? '';
export function notify(message: string): void {
  host.localStorage.getItem(message);
}
// a helper of this module that wraps notify: a unit may call it, or inline its body
export function announce(code: number): void {
  notify(code > 3 ? 'high' : 'low');
}
