// A tagged template whose tag is a member (`db.query\`...\``) called inside a try: a call that may fault looks its
// method up before its arguments, and a tagged template's callee is its tag, not an `expression` (w1e: the shape
// `this.prisma.$queryRaw\`SELECT 1\`` reached the translator once members of an incomplete type were read)
interface Db {
  query(strings: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

export async function ping(db: Db, id: number): Promise<boolean> {
  try {
    await db.query`SELECT ${id}`;
    return true;
  } catch {
    return false;
  }
}
