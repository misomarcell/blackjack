import type { ChatMessage } from '@blackjack/shared/protocol';
import { sql } from './client';

interface ChatRow {
	id: number;
	username: string;
	text: string;
	created_at: Date;
}

const HISTORY_SIZE = 40;

function toMessage(row: ChatRow): ChatMessage {
	return {
		id: Number(row.id),
		username: row.username,
		text: row.text,
		sentAt: row.created_at.toISOString(),
	};
}

export async function addChatMessage(tableId: string, userId: number, text: string): Promise<number> {
	const result =
		await sql`INSERT INTO chat_messages (table_id, user_id, text) VALUES (${tableId}, ${userId}, ${text})`;
	return Number(result.lastInsertRowid);
}

export async function recentChatMessages(tableId: string): Promise<ChatMessage[]> {
	const rows = await sql<ChatRow[]>`
		SELECT m.id, u.username, m.text, m.created_at FROM chat_messages m
		JOIN users u ON u.id = m.user_id
		WHERE m.table_id = ${tableId}
		ORDER BY m.id DESC LIMIT ${HISTORY_SIZE}`;
	return rows.map(toMessage).reverse();
}
