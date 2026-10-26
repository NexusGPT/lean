import { Mapper } from "./mapper";
import type { Repo, Audit } from "./ports";
export class ChatService {
  private readonly tag = "chat";
  constructor(private readonly repo: Repo, private readonly audit: Audit) {}
  async regenerate(chatId: string, userId: string): Promise<{ ok: boolean; id: string }> {
    const row = await this.repo.find(chatId);
    if (row === null) return { ok: false, id: chatId };
    await this.audit.log(this.tag, userId);
    return { ok: true, id: this.label(row.id) };
  }
  label(id: string): string {
    return this.tag + ":" + id;
  }
  static dto(x: { id: string }): string {
    return Mapper.out(x);
  }
}
