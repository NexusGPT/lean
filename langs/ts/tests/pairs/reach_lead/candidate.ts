export interface Options { tier?: string; tags?: string[] }

export function label(name: string, options?: Options): string {
  const tier = options?.tier;
  if (tier === "gold") {
    if (options?.tags?.[0] === "vip") {
      const rate = name.length * 2;
      return `${name}:VIP:${rate}`;
    }
    return `${name}:gold`;
  }
  return `${name}:${tier ?? "basic"}`;
}
