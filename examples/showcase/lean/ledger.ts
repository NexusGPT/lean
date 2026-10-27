export type Account = { id: string; owner: string; balance: number };

export function index(accounts: Account[]): Record<string, Account> {
  let byId: Record<string, Account> = {};
  for (const a of accounts) byId = { ...byId, [a.id]: a };
  return byId;
}
