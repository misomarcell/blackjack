import type { Context } from 'hono';

interface ValidationResult {
	success: boolean;
	error?: { issues: readonly { message: string }[] };
}

/** Turns a failed zod validation into a friendly `{ error }` response with the first issue. */
export function validationHook(result: ValidationResult, c: Context): Response | undefined {
	if (result.success) {
		return undefined;
	}
	return c.json({ error: result.error?.issues[0]?.message ?? 'Invalid input' }, 400);
}
