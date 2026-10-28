// expect: optional-chain
// an optional call through a computed callee stays out: the callee has no name to read once as an Option
export function fire(handlers: Record<string, (() => void) | undefined>, key: string): void {
  handlers[key]?.();
}
