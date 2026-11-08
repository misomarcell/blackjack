import type { TableSummary } from './api';
import type { TableView } from './table-view';

export type PlayerAction = 'hit' | 'stand' | 'double' | 'split';

export interface ChatMessage {
	id: number;
	username: string;
	text: string;
	sentAt: string;
}

/** How a fragment of a table log line is highlighted. */
type LogTone = 'text' | 'player' | 'dealer' | 'money' | 'value';

export interface LogPart {
	tone: LogTone;
	text: string;
}

/** One line of the table log, such as "alice hits on 12". */
export interface LogEntry {
	id: number;
	parts: LogPart[];
}

/** Messages a client sends over a table socket. A player can hold several seats, so seat messages name one. */
export type ClientMessage =
	| { type: 'sit'; seat: number }
	| { type: 'leave-seat'; seat: number }
	| { type: 'bet'; seat: number; amount: number }
	| { type: 'clear-bet'; seat: number }
	/** Sets the seat's bet to exactly `amount` and confirms it (0 sits the round out). */
	| { type: 'rebet'; seat: number; amount: number }
	| { type: 'ready'; seat: number }
	| { type: 'action'; seat: number; action: PlayerAction }
	| { type: 'insurance'; seat: number; accept: boolean }
	| { type: 'chat'; text: string };

/** Messages the server sends over a table socket. */
export type TableServerMessage =
	| { type: 'state'; table: TableView }
	| { type: 'chat'; message: ChatMessage }
	| { type: 'chat-history'; messages: ChatMessage[] }
	| { type: 'log'; entry: LogEntry }
	| { type: 'log-history'; entries: LogEntry[] }
	| { type: 'balance'; balance: number }
	| { type: 'error'; message: string }
	| { type: 'closed' };

/** Messages the server sends over the lobby socket. */
export interface LobbyServerMessage {
	type: 'tables';
	tables: TableSummary[];
}
