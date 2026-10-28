export type Account = { id: string; owner: string; balance: number };

export function index(accounts: Account[]): Record<string, Account> {
  let byId: Record<string, Account> = {};
  accounts.forEach((a) => { byId = { ...byId, [a.id]: a }; });
  return byId;
}
