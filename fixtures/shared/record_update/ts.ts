export type Account = { readonly id: number; readonly balance: number };

export function deposit(a: Account, amount: number): Account {
  return { ...a, balance: a.balance + amount };
}
