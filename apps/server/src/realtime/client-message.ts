import { CHAT_MAX_LENGTH, type ClientMessage } from '@blackjack/shared/protocol';
import { z } from 'zod';

const seat = z.number().int();

const clientMessageSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('sit'), seat }),
	z.object({ type: z.literal('leave-seat'), seat }),
	z.object({ type: z.literal('bet'), seat, amount: z.number() }),
	z.object({ type: z.literal('clear-bet'), seat }),
	z.object({ type: z.literal('ready'), seat }),
	z.object({ type: z.literal('action'), seat, action: z.enum(['hit', 'stand', 'double', 'split']) }),
	z.object({ type: z.literal('insurance'), seat, accept: z.boolean() }),
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
