import { config } from '../config';
import { sql } from './client';
import { syncAdminFlag } from './users.repo';

const RETRY_DELAY_MS = 2000;
const MAX_ATTEMPTS = 30;

const schema = [
	`CREATE TABLE IF NOT EXISTS users (
		id INT AUTO_INCREMENT PRIMARY KEY,
		username VARCHAR(24) NOT NULL UNIQUE,
		email VARCHAR(254) NOT NULL UNIQUE,
		password_hash VARCHAR(255) NOT NULL,
		balance DECIMAL(12, 2) NOT NULL,
		is_admin BOOLEAN NOT NULL DEFAULT FALSE,
		last_refill_at TIMESTAMP NULL DEFAULT NULL,
		hands_played INT NOT NULL DEFAULT 0,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS blackjack_tables (
		id VARCHAR(12) PRIMARY KEY,
		name VARCHAR(40) NOT NULL,
		min_bet INT NOT NULL,
		max_bet INT NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS chat_messages (
		id BIGINT AUTO_INCREMENT PRIMARY KEY,
		table_id VARCHAR(12) NOT NULL,
		user_id INT NOT NULL,
		text VARCHAR(200) NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		INDEX idx_chat_table (table_id, id),
		FOREIGN KEY (table_id) REFERENCES blackjack_tables(id) ON DELETE CASCADE,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS table_log (
		id BIGINT AUTO_INCREMENT PRIMARY KEY,
		table_id VARCHAR(12) NOT NULL,
		parts TEXT NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		INDEX idx_log_table (table_id, id),
		FOREIGN KEY (table_id) REFERENCES blackjack_tables(id) ON DELETE CASCADE
	)`,
];

async function waitForDatabase(): Promise<void> {
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			await sql`SELECT 1`;
			return;
		} catch (error) {
			console.warn(`Database not ready (attempt ${attempt}/${MAX_ATTEMPTS})`, String(error));
			await Bun.sleep(RETRY_DELAY_MS);
		}
	}
	throw new Error('Database never became available');
}

async function seedTables(): Promise<void> {
	const [row] = await sql`SELECT COUNT(*) AS count FROM blackjack_tables`;
	if (Number(row.count) > 0) {
		return;
	}
	await sql`INSERT INTO blackjack_tables (id, name, min_bet, max_bet) VALUES
		('lucky7', 'Lucky Sevens', 5, 500),
		('neon', 'Neon Lounge', 10, 1000),
		('whale', 'High Rollers', 100, 5000)`;
}

/** Columns added to `users` after the first release, for databases created before them. */
const addedUserColumns: Record<string, string> = {
	last_refill_at: 'TIMESTAMP NULL DEFAULT NULL',
	hands_played: 'INT NOT NULL DEFAULT 0',
};

async function addMissingColumns(): Promise<void> {
	for (const [column, definition] of Object.entries(addedUserColumns)) {
		const [row] = await sql`
			SELECT COUNT(*) AS count FROM information_schema.columns
			WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = ${column}`;
		if (Number(row.count) === 0) {
			await sql.unsafe(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
		}
	}
}

/** Creates the schema on first start and seeds a few tables so the lobby is never empty. */
export async function migrate(): Promise<void> {
	await waitForDatabase();
	for (const ddl of schema) {
		await sql.unsafe(ddl);
	}
	await addMissingColumns();
	await seedTables();
	await syncAdminFlag(config.adminUsername);
	await warnIfAdminUnclaimed();
}

/** Until the admin registers, anyone who guesses ADMIN_USERNAME could register it and get admin rights. */
async function warnIfAdminUnclaimed(): Promise<void> {
	const [row] = await sql`SELECT COUNT(*) AS count FROM users WHERE is_admin = TRUE`;
	if (Number(row.count) === 0) {
		console.warn(
			`No admin yet: register "${config.adminUsername}" now, before sharing the site.`,
			'Use a hard-to-guess ADMIN_USERNAME on a public server.',
		);
	}
}
