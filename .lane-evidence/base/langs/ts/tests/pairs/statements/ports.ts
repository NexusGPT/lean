export interface AuditPort { record(event: string): Promise<void>; }
