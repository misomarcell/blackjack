import { CHAT_MAX_LENGTH, type ClientMessage } from '@blackjack/shared/protocol';
import { z } from 'zod';

const clientMessageSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('sit'), seat: z.number().int() }),
	z.object({ type: z.literal('leave-seat') }),
	z.object({ type: z.literal('bet'), amount: z.number() }),
	z.object({ type: z.literal('clear-bet') }),
	z.object({ type: z.literal('ready') }),
	z.object({ type: z.literal('action'), action: z.enum(['hit', 'stand', 'double', 'split']) }),
	z.object({ type: z.literal('insurance'), accept: z.boolean() }),
	z.object({ type: z.literal('chat'), text: z.string().max(CHAT_MAX_LENGTH) }),
]) satisfies z.ZodType<ClientMessage>;

/** Parses a raw socket frame. Returns null for anything that is not a valid client message. */
export function parseClientMessage(raw: unknown): ClientMessage | null {
	if (typeof raw !== 'string') {
		return null;
	}
	try {
		const result = clientMessageSchema.safeParse(JSON.parse(raw));
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}
