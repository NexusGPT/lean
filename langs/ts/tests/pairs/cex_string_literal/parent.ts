const PREFIX = 'admin/';

// The page a request path renders.
export function route(path: string): string {
  if (path === '') return 'home';
  return 'page';
}
