// a recovery that starts once and is awaited by every caller (n8n's N8nSandboxServiceSandbox.recover), with its await
// moved before the assignment: the recovery promise is made after the await, so nobody awaits it and its rejection is
// left unhandled after the call returned
export class Recoverer {
	private recoveryPromise?: Promise<void>;

	constructor(private readonly start: () => Promise<boolean>) {}

	async recover(): Promise<void> {
		await this.recoveryPromise;
		this.recoveryPromise ??= (async () => {
			if (!(await this.start())) throw new Error("Sandbox failed to start (status: pending)");
		})().finally(() => {
			this.recoveryPromise = undefined;
		});
	}
}
