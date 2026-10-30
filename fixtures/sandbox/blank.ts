// The other side of the probes in probes.ts: every unit answers the empty string, so lane B's witness shows the probe's
// own outcome on its parent side.
export function reachHost(): string { return ''; }
export function fileRead(): string { return ''; }
export function envRead(): string { return ''; }
export function fileWrite(): string { return ''; }
export function childProcess(): string { return ''; }
export function nativeAddon(): string { return ''; }
export function workerThread(): string { return ''; }
export async function netSocket(): Promise<string> { return ''; }
export async function hostFetch(): Promise<string> { return ''; }
export async function sandboxFetch(): Promise<string> { return ''; }
