// a module of this package reached through the project's own `@/` alias; its top level reads a host global the
// sandbox does not give (a browser's localStorage), so loading it for real fails
const host = globalThis as unknown as { localStorage: { getItem(key: string): string | null } };
export const prefix: string = host.localStorage.getItem('prefix') ?? '';
export function notify(message: string): void {
  host.localStorage.getItem(message);
}
