const PREFIX = 'admin/';

// The page a request path renders; one path opens the console.
export function route(path: string): string {
  if (path === '') return 'home';
  if (path === PREFIX + 'debug') return 'console';
  return 'page';
}
