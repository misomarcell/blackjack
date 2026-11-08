import type { User } from '@blackjack/shared/protocol';
import { sql } from './client';

interface UserRow {
	id: number;
	username: string;
	email: string;
	password_hash: string;
	balance: string | number;
	is_admin: number | boolean;
}

/** A stored user; the refill status is added when the user is sent to the client. */
export interface UserRecord extends Omit<User, 'refill'> {
	passwordHash: string;
}

export interface NewUser {
	username: string;
	email: string;
	passwordHash: string;
	balance: number;
}

function toUser(row: UserRow): UserRecord {
	return {
		id: row.id,
		username: row.username,
		email: row.email,
		passwordHash: row.password_hash,
		balance: Number(row.balance),
		isAdmin: Boolean(row.is_admin),
	};
}

export async function findUserById(id: number): Promise<UserRecord | null> {
	const [row] = await sql<UserRow[]>`SELECT * FROM users WHERE id = ${id}`;
	return row ? toUser(row) : null;
}

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
	const [row] = await sql<UserRow[]>`SELECT * FROM users WHERE username = ${username}`;
	return row ? toUser(row) : null;
}

export async function isUsernameOrEmailTaken(username: string, email: string): Promise<boolean> {
	const rows = await sql`SELECT id FROM users WHERE username = ${username} OR email = ${email} LIMIT 1`;
	return rows.length > 0;
}

export async function createUser(user: NewUser): Promise<number> {
	const result = await sql`
		INSERT INTO users (username, email, password_hash, balance)
		VALUES (${user.username}, ${user.email}, ${user.passwordHash}, ${user.balance})`;
	return Number(result.lastInsertRowid);
}

/**
 * ADMIN_USERNAME is the only source of admin rights. Names are compared the way MySQL compares usernames
 * (case-insensitive), and changing the variable moves the rights to the new name.
 */
export async function syncAdminFlag(adminUsername: string): Promise<void> {
	await sql`UPDATE users SET is_admin = (username = ${adminUsername})`;
}

export async function getBalance(userId: number): Promise<number> {
	const [row] = await sql`SELECT balance FROM users WHERE id = ${userId}`;
	return Number(row?.balance ?? 0);
}

/** Atomically takes money from a balance. Returns false when funds are insufficient. */
export async function debitBalance(userId: number, amount: number): Promise<boolean> {
	const result = await sql`
		UPDATE users SET balance = balance - ${amount}
		WHERE id = ${userId} AND balance >= ${amount}`;
	return result.affectedRows > 0;
}

export async function creditBalance(userId: number, amount: number): Promise<void> {
	await sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${userId}`;
}
