/** REST payloads shared by the server and the web app. */

export interface User {
	id: number;
	username: string;
	email: string;
	balance: number;
	isAdmin: boolean;
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
