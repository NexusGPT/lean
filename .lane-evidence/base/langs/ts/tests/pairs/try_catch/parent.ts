import type { Port } from "./ports";
export class Fetcher {
  constructor(private readonly port: Port) {}
  async load(id: string): Promise<string> {
    try {
      const v = await this.port.get(id);
      return v.trim();
    } catch (e) {
      return "";
    }
  }
  async loadOrThrow(id: string): Promise<number> {
    try {
      const n = await this.port.count(id);
      if (n < 0) throw new Error("negative");
      return n;
    } catch (e) {
      await this.port.log(String(e));
      return 0;
    }
  }
}
export function parse(s: string): number {
  try {
    return Number(s);
  } catch (e) {
    return 0;
  }
}
