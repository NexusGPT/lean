export async function late(): Promise<unknown> { return import("./missing-lazy-module"); }
