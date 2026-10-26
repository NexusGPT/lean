export async function dynamicOk(): Promise<number> { const m = await import("./exports"); return m.present; }
