import type { TableConfig } from '@blackjack/shared/protocol';
import { sql } from './client';

interface TableRow {
	id: string;
	name: string;
	min_bet: number;
	max_bet: number;
}

export interface TableRecord extends TableConfig {
	id: string;
}

function toTable(row: TableRow): TableRecord {
	return { id: row.id, name: row.name, minBet: row.min_bet, maxBet: row.max_bet };
}

export async function listTables(): Promise<TableRecord[]> {
	const rows = await sql<TableRow[]>`SELECT * FROM blackjack_tables ORDER BY min_bet, name`;
	return rows.map(toTable);
}

export async function findTable(id: string): Promise<TableRecord | null> {
	const [row] = await sql<TableRow[]>`SELECT * FROM blackjack_tables WHERE id = ${id}`;
	return row ? toTable(row) : null;
}

export async function createTable(table: TableRecord): Promise<void> {
	await sql`
		INSERT INTO blackjack_tables (id, name, min_bet, max_bet)
		VALUES (${table.id}, ${table.name}, ${table.minBet}, ${table.maxBet})`;
}

export async function updateTable(table: TableRecord): Promise<boolean> {
	const result = await sql`
		UPDATE blackjack_tables SET name = ${table.name}, min_bet = ${table.minBet}, max_bet = ${table.maxBet}
		WHERE id = ${table.id}`;
	return result.affectedRows > 0;
}

export async function deleteTable(id: string): Promise<boolean> {
	const result = await sql`DELETE FROM blackjack_tables WHERE id = ${id}`;
	return result.affectedRows > 0;
}
