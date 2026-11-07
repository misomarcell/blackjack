import type { LogEntry, LogPart } from '@blackjack/shared/protocol';
import { sql } from './client';

interface LogRow {
	id: number;
	parts: string;
}

const HISTORY_SIZE = 60;

/** Log lines are stored as their JSON parts, so the highlighting survives a reload. */
export async function addLogEntry(tableId: string, parts: LogPart[]): Promise<number> {
	const json = JSON.stringify(parts);
	const result = await sql`INSERT INTO table_log (table_id, parts) VALUES (${tableId}, ${json})`;
	return Number(result.lastInsertRowid);
}

export async function recentLogEntries(tableId: string): Promise<LogEntry[]> {
	const rows = await sql<LogRow[]>`
		SELECT id, parts FROM table_log WHERE table_id = ${tableId} ORDER BY id DESC LIMIT ${HISTORY_SIZE}`;
	return rows.map((row) => ({ id: Number(row.id), parts: JSON.parse(row.parts) as LogPart[] })).reverse();
}
