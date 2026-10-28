// The outside of the barcode pass: the barcode helpers are bodiless externals here, the store is a tagged query.
export declare function normaliseGtin(raw: string | null): string | null;
export declare function isInstoreWeighed(gtin: string): boolean;
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;
export type ProductRow = { product_id: string; gtin: string | null };
export type AliasRow = { store_item_id: string; gtin: string };
export type BarcodeReport = {
  products_read: number;
  products_with_barcode: number;
  alias_rows_read: number;
  store_items_with_aliases: number;
  weighed_unbound: number;
  label: string;
};
// The ports of a delete use case (a comment-only refactor of its body, design/race-pure.md).
export declare const AGENT_CACHE_PORT: unique symbol;
export declare const AGENT_REPOSITORY_PORT: unique symbol;
export type AgentRow = { id: string; codeInterpreterSkillsUrl: string | null };
export interface AgentRepositoryPort {
  findByIdAndOrganization(id: string, organizationId: string): Promise<AgentRow | null>;
  softDelete(id: string, organizationId: string): Promise<boolean>;
  hardDelete(id: string, organizationId: string, actorUserId: string | null): Promise<{ deleted: boolean; orphanedSkillKeys: string[] }>;
}
export interface AgentCachePort { evict(id: string): Promise<void>; }
export interface CodeInterpreterSkillsService {
  listSkillS3KeysForEmployee(id: string): Promise<string[]>;
  deleteS3KeysBestEffort(keys: string[], id: string): Promise<void>;
}
export interface DeletionPolicyService { getPolicy(kind: string): Promise<"SOFT" | "HARD">; }
export interface S3Client { deleteFileByUrl(url: string): Promise<void>; }
export interface RetireDeletedAgentSkillKeysService { execute(keys: string[], id: string): Promise<void>; }
