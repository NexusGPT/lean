// Core form of record_update, written by hand. The translation of ts.ts must carry the same signature.
datatype Account = Account(id: int, balance: int)

function deposit(a: Account, amount: int): (result: Account)
  ensures result.id == a.id
  ensures result.balance == a.balance + amount
{
  a.(balance := a.balance + amount)
}
