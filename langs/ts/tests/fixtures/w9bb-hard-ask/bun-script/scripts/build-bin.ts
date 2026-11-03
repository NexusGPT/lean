// a build script Bun runs (cline's build-sidecar-bin.ts): `bun` is the runtime's own module, declared by @types/bun
import { $ } from "bun";
import { Database } from "bun:sqlite";

export function compileTarget(triple: string): string | null {
	if (triple.startsWith("aarch64-apple-darwin")) return "bun-darwin-arm64";
	if (triple.startsWith("x86_64-pc-windows")) return "bun-windows-x64";
	if (triple.startsWith("x86_64-unknown-linux")) return "bun-linux-x64-baseline";
	return null;
}

export async function compress(file: string): Promise<void> {
	await $`upx --best ${file}`;
	new Database(":memory:").close();
}
