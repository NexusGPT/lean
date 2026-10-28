// expect: foreach
export async function notifyAll(users: readonly { email: string }[], send: (to: string) => Promise<void>): Promise<number> {
  let sent = 0;
  users.forEach(async (u) => {
    await send(u.email);
    sent += 1;
  });
  return sent;
}
