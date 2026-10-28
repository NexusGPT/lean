import type { Mailer } from "./ports";
type User = { email: string; active: boolean };
export class Notifier {
  constructor(private readonly mailer: Mailer) {}
  async notifyAll(users: readonly User[]): Promise<number> {
    let sent = 0;
    for (const u of users) {
      if (!u.active) continue;
      await this.mailer.send(u.email);
      sent += 1;
    }
    return sent;
  }
}
export function total(xs: readonly number[]): number {
  let t = 0;
  xs.forEach((x) => { t += x * 2; });
  return t;
}
export function labels(xs: readonly string[]): string[] {
  const out: string[] = [];
  xs.forEach((x) => out.push(x.trim()));
  return out;
}
