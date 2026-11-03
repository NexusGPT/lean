// a settings schema on zod 4's top-level formats (Checkmate's Validation/settings.ts): z.email() is zod 4 API
import { z } from "zod";

export const settingsSchema = z.object({
	systemEmailAddress: z.email().optional(),
	systemEmailPort: z.number().int().optional(),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

export function portOrDefault(port: number | undefined, secure: boolean): number {
	if (port !== undefined && port > 0) return port;
	return secure ? 465 : 587;
}
