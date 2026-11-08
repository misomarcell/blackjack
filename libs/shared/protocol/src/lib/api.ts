/** REST payloads shared by the server and the web app. */

export interface User {
	id: number;
	username: string;
	email: string;
	balance: number;
	isAdmin: boolean;
	refill: RefillStatus;
}

/** The once-a-day free refill. */
export interface RefillStatus {
	/** Milliseconds until the next refill is allowed (0 = now), relative to when the response was sent. */
	waitMs: number;
	/** A refill tops the balance up to this amount. */
	upTo: number;
}

/** One row of the lobby leaderboard, richest first. */
export interface LeaderboardEntry {
	rank: number;
	username: string;
	balance: number;
}

/** A player as listed on the admin player page. */
export interface PlayerSummary {
	id: number;
	username: string;
	email: string;
	balance: number;
	isAdmin: boolean;
	createdAt: string;
}

export interface Credentials {
	username: string;
	password: string;
}

export interface Registration extends Credentials {
	email: string;
}

export interface TableConfig {
	name: string;
	minBet: number;
	maxBet: number;
}

export interface TableSummary extends TableConfig {
	id: string;
	players: number;
	seats: number;
}

export interface ApiError {
	error: string;
}
