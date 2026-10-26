import type { Repo } from "./ports3";
type Row = { id: string; note?: string };
export function label(r: Row, fallback: string): string { return r.note || fallback; }
export function pick(r: Row | null, d: string): string { const v = (r && r.id) || d; return v; }
export function kind(x: number | undefined): number | string { return x ?? "none"; }
export class Svc {
  constructor(private readonly repo: Repo) {}
  async find(id: string, fresh: boolean): Promise<string> { const v = fresh ? await this.repo.get(id) : "cached"; return v; }
  async maybe(id: string, on: boolean): Promise<boolean> { const ok = on && (await this.repo.has(id)); return ok; }
}
