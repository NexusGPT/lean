// The barcode pass's shape (a query, a Map of aliases built in a loop, awaits in a loop over a query result, a report
// written at the end), four times: a pure local added, a pure computation moved, the two queries awaited in another
// order, and the shape untouched. The barcode helpers are bodiless externals (api.d.ts). Then a use case on a
// receiver whose two sides differ by a comment only.
import { normaliseGtin, isInstoreWeighed } from './api';
import type { Sql, ProductRow, AliasRow, BarcodeReport, AgentCachePort, AgentRepositoryPort, CodeInterpreterSkillsService, DeletionPolicyService, S3Client, RetireDeletedAgentSkillKeysService } from './api';
import { AGENT_CACHE_PORT, AGENT_REPOSITORY_PORT } from './api';
import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";

export async function bindPure(sql: Sql, log: (s: string) => void): Promise<BarcodeReport> {
  const products = (await sql`select product_id, gtin from product`) as unknown as ProductRow[];
  const report: BarcodeReport = { products_read: products.length, products_with_barcode: 0, alias_rows_read: 0, store_items_with_aliases: 0, weighed_unbound: 0, label: "" };
  const keyOfProduct = new Map<string, string>();
  for (const p of products) {
    const key = normaliseGtin(p.gtin);
    if (key === null) continue;
    report.products_with_barcode++;
    keyOfProduct.set(p.product_id, key);
  }
  const aliasRows = (await sql`select store_item_id, gtin from store_item_gtin`) as unknown as AliasRow[];
  report.alias_rows_read = aliasRows.length;
  const aliases = new Map<string, string[]>();
  for (const r of aliasRows) {
    const key = normaliseGtin(r.gtin);
    if (key === null) continue;
    const list = aliases.get(r.store_item_id);
    if (list) list.push(key);
    else aliases.set(r.store_item_id, [key]);
  }
  report.store_items_with_aliases = aliases.size;
  for (const [productId, key] of keyOfProduct) {
    if (!isInstoreWeighed(key)) continue;
    await sql`update store_item set product_id = null where product_id = ${productId}`;
    report.weighed_unbound++;
    log(`weighed article unbound: ${productId}`);
  }
  report.label = `${report.products_with_barcode} of ${report.products_read}`;
  return report;
}

export async function bindMoved(sql: Sql, log: (s: string) => void): Promise<BarcodeReport> {
  const products = (await sql`select product_id, gtin from product`) as unknown as ProductRow[];
  const report: BarcodeReport = { products_read: products.length, products_with_barcode: 0, alias_rows_read: 0, store_items_with_aliases: 0, weighed_unbound: 0, label: "" };
  const keyOfProduct = new Map<string, string>();
  for (const p of products) {
    const key = normaliseGtin(p.gtin);
    if (key === null) continue;
    report.products_with_barcode++;
    keyOfProduct.set(p.product_id, key);
  }
  const aliasRows = (await sql`select store_item_id, gtin from store_item_gtin`) as unknown as AliasRow[];
  report.alias_rows_read = aliasRows.length;
  const aliases = new Map<string, string[]>();
  for (const r of aliasRows) {
    const key = normaliseGtin(r.gtin);
    if (key === null) continue;
    const list = aliases.get(r.store_item_id);
    if (list) list.push(key);
    else aliases.set(r.store_item_id, [key]);
  }
  report.store_items_with_aliases = aliases.size;
  for (const [productId, key] of keyOfProduct) {
    if (!isInstoreWeighed(key)) continue;
    await sql`update store_item set product_id = null where product_id = ${productId}`;
    report.weighed_unbound++;
    log(`weighed article unbound: ${productId}`);
  }
  report.label = `${report.products_with_barcode} of ${report.products_read}`;
  return report;
}

export async function bindAwaitOrder(sql: Sql, log: (s: string) => void): Promise<BarcodeReport> {
  const products = (await sql`select product_id, gtin from product`.catch(() => [])) as unknown as ProductRow[];
  const aliasRows = (await sql`select store_item_id, gtin from store_item_gtin`.catch(() => [])) as unknown as AliasRow[];
  const report: BarcodeReport = { products_read: products.length, products_with_barcode: 0, alias_rows_read: 0, store_items_with_aliases: 0, weighed_unbound: 0, label: "" };
  const keyOfProduct = new Map<string, string>();
  for (const p of products) {
    const key = normaliseGtin(p.gtin);
    if (key === null) continue;
    report.products_with_barcode++;
    keyOfProduct.set(p.product_id, key);
  }
  report.alias_rows_read = aliasRows.length;
  const aliases = new Map<string, string[]>();
  for (const r of aliasRows) {
    const key = normaliseGtin(r.gtin);
    if (key === null) continue;
    const list = aliases.get(r.store_item_id);
    if (list) list.push(key);
    else aliases.set(r.store_item_id, [key]);
  }
  report.store_items_with_aliases = aliases.size;
  for (const [productId, key] of keyOfProduct) {
    if (!isInstoreWeighed(key)) continue;
    await sql`update store_item set product_id = null where product_id = ${productId}`;
    report.weighed_unbound++;
    log(`weighed article unbound: ${productId}`);
  }
  report.label = `${report.products_with_barcode} of ${report.products_read}`;
  return report;
}

export async function bindUntouched(sql: Sql, log: (s: string) => void): Promise<BarcodeReport> {
  const products = (await sql`select product_id, gtin from product`) as unknown as ProductRow[];
  const report: BarcodeReport = { products_read: products.length, products_with_barcode: 0, alias_rows_read: 0, store_items_with_aliases: 0, weighed_unbound: 0, label: "" };
  const keyOfProduct = new Map<string, string>();
  for (const p of products) {
    const key = normaliseGtin(p.gtin);
    if (key === null) continue;
    report.products_with_barcode++;
    keyOfProduct.set(p.product_id, key);
  }
  const aliasRows = (await sql`select store_item_id, gtin from store_item_gtin`) as unknown as AliasRow[];
  report.alias_rows_read = aliasRows.length;
  const aliases = new Map<string, string[]>();
  for (const r of aliasRows) {
    const key = normaliseGtin(r.gtin);
    if (key === null) continue;
    const list = aliases.get(r.store_item_id);
    if (list) list.push(key);
    else aliases.set(r.store_item_id, [key]);
  }
  report.store_items_with_aliases = aliases.size;
  for (const [productId, key] of keyOfProduct) {
    if (!isInstoreWeighed(key)) continue;
    await sql`update store_item set product_id = null where product_id = ${productId}`;
    report.weighed_unbound++;
    log(`weighed article unbound: ${productId}`);
  }
  report.label = `${report.products_with_barcode} of ${report.products_read}`;
  return report;
}

export interface DeleteAgentInput {
  id: string;
  organizationId: string;
  actorUserId: string | null;
}

export interface DeleteAgentResult {
  id: string;
  mode: "SOFT" | "HARD";
}

// Deletes an agent under the system-wide deletion policy (soft or hard), then evicts it from the cache.
@Injectable()
export class DeleteAgentUseCase {
  private readonly logger = new Logger(DeleteAgentUseCase.name);

  constructor(
    @Inject(AGENT_REPOSITORY_PORT)
    private readonly repository: AgentRepositoryPort,
    private readonly s3: S3Client,
    private readonly codeInterpreterSkillsService: CodeInterpreterSkillsService,
    private readonly deletionPolicy: DeletionPolicyService,
    private readonly retireSkillKeys: RetireDeletedAgentSkillKeysService,
    @Inject(AGENT_CACHE_PORT)
    private readonly agentCache: Pick<AgentCachePort, "evict">
  ) {}

  async execute(input: DeleteAgentInput): Promise<DeleteAgentResult> {
    // Step 1: Verify ownership. `findByIdAndOrganization` filters
    // `deletedAt: null` at the repo layer, so a soft-deleted agent surfaces
    // here as a missing row — re-delete returns 404, idempotent from the
    // caller's perspective. Race-loss on the actual write is caught at
    // step 2 via the `performed` boolean.
    const agent = await this.repository.findByIdAndOrganization(input.id, input.organizationId);

    if (!agent) {
      throw new NotFoundException(`Agent not found: ${input.id}`);
    }

    // Step 2: Branch on policy. The repo returns whether the write actually
    // affected a row; false means another node deleted the agent between our
    // existence check above and the write here. Surface that as a 404 so the
    // audit trail (Echo decorator + AdminAuditInterceptor) doesn't claim a
    // delete that another node already performed.
    const mode = await this.deletionPolicy.getPolicy("agent");

    // Snapshot per-skill S3 keys BEFORE hardDelete. `CodeInterpreterSkill`
    // rows cascade-delete with the agent (Prisma `onDelete: Cascade`), so a
    // post-delete query returns [] and would orphan every ZIP in S3.
    // SOFT mode preserves the rows, so no snapshot is needed there.
    const skillS3Keys =
      mode === "HARD"
        ? await this.codeInterpreterSkillsService.listSkillS3KeysForEmployee(input.id)
        : [];

    // SOFT preserves the enablement rows, so nothing is stranded and there is
    // nothing to retire — the agent is restorable and must come back holding
    // the credentials it had.
    const outcome =
      mode === "SOFT"
        ? {
            deleted: await this.repository.softDelete(input.id, input.organizationId),
            orphanedSkillKeys: []
          }
        : await this.repository.hardDelete(input.id, input.organizationId, input.actorUserId);

    if (!outcome.deleted) {
      throw new NotFoundException(`Agent not found: ${input.id}`);
    }

    // Evict BEFORE anything else observes the delete, in BOTH modes.
    // `AgentInferenceCacheService.getAgent` reads Redis before Postgres and the
    // entries carry a 900-second default TTL, so without this the `deletedAt`
    // filter on the DB loader is bypassed entirely for up to fifteen minutes and
    // a deleted agent keeps answering customers on every channel. HARD mode needs
    // it just as much: the row is gone from Postgres and the cached
    // `InferenceAgent` is a self-contained blob that never re-reads it.
    //
    // Failure does not abort the delete — the row is already gone or stamped, and
    // throwing here would tell the caller a delete failed that in fact succeeded,
    // which invites a retry that cannot help. It is logged at `error` rather than
    // swallowed, because a silent miss here IS the fifteen-minute hole and the
    // only symptom is a deleted agent replying to a customer.
    try {
      await this.agentCache.evict(input.id);
    } catch (error) {
      this.logger.error(
        `Failed to evict agent ${input.id} from the inference cache after ${mode} delete; ` +
          `it may keep answering until the entry expires: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Retire before the S3 cleanup: a live credential outranks a stale ZIP, and
    // the retirement cannot throw, so it cannot displace the cleanup either.
    await this.retireSkillKeys.execute(outcome.orphanedSkillKeys, input.id);

    // Step 3: Best-effort S3 cleanup of skill artifacts — HARD mode only.
    // Running this in SOFT mode would erase the files while leaving the
    // agent restorable, so a subsequent restore would surface an agent with
    // broken file references. SOFT mode keeps S3 objects reachable until
    // either restore (intact) or eventual manual purge.
    if (mode === "HARD" && skillS3Keys.length > 0) {
      await this.codeInterpreterSkillsService.deleteS3KeysBestEffort(skillS3Keys, input.id);
    }

    if (mode === "HARD" && agent.codeInterpreterSkillsUrl !== null) {
      try {
        await this.s3.deleteFileByUrl(agent.codeInterpreterSkillsUrl);
      } catch (error) {
        this.logger.warn(
          `Failed to delete skills file from S3 for agent ${input.id}: ${String(error)}`
        );
      }
    }

    this.logger.log(
      `Agent ${mode === "SOFT" ? "soft-deleted" : "hard-deleted (tombstoned)"}: ${input.id} (org=${input.organizationId})`
    );

    return { id: input.id, mode };
  }
}
