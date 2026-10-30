// A method that reads the world through its injected services. Lane B's fake answers each read with a handle about one
// time in two and a dead value (null, undefined, 0, '', false, an empty list) otherwise, so a chain of five reads
// reaches its end on few inputs; a field of the world is never the key the caller passed; and a handle read as a list
// holds two elements, never one (exec/fake.mjs, design/world-reach.md).
export class Records {
  constructor(private readonly db: any, private readonly api: any) {}

  // an ownership guard the world must pass (the record of the caller's organisation), then the changed lock test
  async rename(args: { recordId: string; orgId: string; name: string }): Promise<string> {
    const row = await this.db.records.findUnique({ where: { id: args.recordId } });
    if (!row) throw new Error("not found");
    if (row.orgId !== args.orgId) throw new Error("not yours");
    const lock = await this.db.locks.findMany({ where: { id: args.recordId } });
    if (!(!lock || lock.length === 0)) throw new Error("not locked");
    return args.name;
  }

  // the same method, its locals renamed: equal
  async renameRefactor(args: { recordId: string; orgId: string; name: string }): Promise<string> {
    const record = await this.db.records.findUnique({ where: { id: args.recordId } });
    if (!record) throw new Error("not found");
    if (record.orgId !== args.orgId) throw new Error("not yours");
    const held = await this.db.locks.findMany({ where: { id: args.recordId } });
    if (!held || held.length === 0) throw new Error("not locked");
    return args.name;
  }

  // a guard at the end of a deep chain of the world: the candidate negates it
  async ownedDeep(orgId: string): Promise<string> {
    const node = await this.db.nodes.findUnique({ where: { id: orgId } });
    if (!node) return "none";
    if (node.execution?.workflow?.owner?.orgId) {
      if (!(node.execution.workflow.owner.orgId !== orgId)) return "foreign";
    }
    return "ok";
  }

  // an empty list against one element: the candidate shifts the bound
  async firstAccount(): Promise<string> {
    const client = await this.api.initializeClient();
    const response = await client.getAccounts({ include: false });
    const accounts = response?.data ?? [];
    if (accounts.length === 1) return "pending";
    for (const account of accounts) {
      const existing = await this.db.credentials.findFirst({ where: { nodeId: account.id } });
      if (existing) return "completed";
    }
    return "pending";
  }

  // the same test written as a bound below one: equal
  async firstAccountRefactor(): Promise<string> {
    const client = await this.api.initializeClient();
    const response = await client.getAccounts({ include: false });
    const accounts = response?.data ?? [];
    if (accounts.length < 1) return "pending";
    for (const item of accounts) {
      const existing = await this.db.credentials.findFirst({ where: { nodeId: item.id } });
      if (existing) return "completed";
    }
    return "pending";
  }
}
