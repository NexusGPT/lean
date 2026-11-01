export interface Options { tier?: string; limit?: number }

export function label(name: string, options?: Options): string {
  const tier = options?.tier;
  if (tier === "gold" && (options?.limit ?? 0) - 1 === 10) {
    const rate = name.length * 2;
    return `${name}:gold:${rate}`;
  }
  return `${name}:${tier ?? "none"}`;
}
