import type { LeaderboardEntry, PlayerSummary } from '@blackjack/shared/protocol';
import { sql } from './client';

interface PlayerRow {
	id: number;
	username: string;
	email: string;
	balance: string | number;
	is_admin: number | boolean;
	created_at: Date | string;
}

/**
 * Tops a balance up to `upTo` at most once per cooldown, in one atomic update: the refill is granted only
 * when the balance is below `upTo` and the previous refill is old enough. Returns whether it was granted.
 */
export async function refillBalance(userId: number, upTo: number, cooldownHours: number): Promise<boolean> {
	const result = await sql`
		UPDATE users SET balance = ${upTo}, last_refill_at = CURRENT_TIMESTAMP
		WHERE id = ${userId} AND balance < ${upTo}
			AND (last_refill_at IS NULL OR last_refill_at <= CURRENT_TIMESTAMP - INTERVAL ${cooldownHours} HOUR)`;
	return result.affectedRows > 0;
}

/** Milliseconds until the user may refill again (0 when they may refill now). */
export async function refillWaitMs(userId: number, cooldownHours: number): Promise<number> {
	const [row] = await sql`
		SELECT GREATEST(0, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP,
			last_refill_at + INTERVAL ${cooldownHours} HOUR)) AS wait
		FROM users WHERE id = ${userId}`;
	return Number(row?.wait ?? 0) * 1000;
}

/** The richest players first; ties are broken by name so the order is stable. */
export async function leaderboard(limit: number): Promise<LeaderboardEntry[]> {
	const rows = await sql<{ username: string; balance: string | number }[]>`
		SELECT username, balance FROM users ORDER BY balance DESC, username ASC LIMIT ${limit}`;
	return rows.map((row, index) => ({
		rank: index + 1,
		username: row.username,
		balance: Number(row.balance),
	}));
}

export async function listPlayers(): Promise<PlayerSummary[]> {
	const rows = await sql<PlayerRow[]>`
		SELECT id, username, email, balance, is_admin, created_at FROM users ORDER BY username ASC`;
	return rows.map((row) => ({
		id: row.id,
		username: row.username,
		email: row.email,
		balance: Number(row.balance),
		isAdmin: Boolean(row.is_admin),
		createdAt: new Date(row.created_at).toISOString(),
	}));
}

/** Removes a player; their chat messages go with them (foreign key cascade). */
export async function deletePlayer(id: number): Promise<boolean> {
	const result = await sql`DELETE FROM users WHERE id = ${id}`;
	return result.affectedRows > 0;
}
