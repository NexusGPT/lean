// The shape of a health controller's echo check: an async method on a class whose one collaborator answers
// whether it is enabled and whether it is available, and a reply built per branch.
export interface EchoDb {
  isEnabled(): boolean;
  isAvailable(): boolean;
  lastError(): string | null;
}

export interface ServiceHealth {
  service: string;
  status: string;
  details?: { note: string };
  error?: string;
}

export class Health {
  constructor(private readonly db: EchoDb) {}

  // the reply of the disabled branch is a literal object, one literal changed
  async checkEcho(): Promise<ServiceHealth> {
    if (!this.db.isEnabled()) {
      return { service: "Echox", status: "pending", details: { note: "Not configured" } };
    }
    if (!this.db.isAvailable()) {
      return { service: "Echo", status: "degraded", error: this.db.lastError() ?? "Startup connect failed" };
    }
    return { service: "Echo", status: "healthy" };
  }

  // the same reply with a local name for the status of the disabled branch
  async checkEchoNamed(): Promise<ServiceHealth> {
    const pending = "pending";
    if (!this.db.isEnabled()) {
      return { service: "Echo", status: pending, details: { note: "Not configured" } };
    }
    return { service: "Echo", status: this.db.isAvailable() ? "healthy" : "degraded" };
  }

  async untouched(): Promise<boolean> {
    return this.db.isEnabled() && this.db.isAvailable();
  }
}
