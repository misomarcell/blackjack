import type { TableSummary } from './api';
import type { TableView } from './table-view';

export type PlayerAction = 'hit' | 'stand' | 'double' | 'split';

export interface ChatMessage {
	id: number;
	username: string;
	text: string;
	sentAt: string;
}

/** Messages a client sends over a table socket. */
export type ClientMessage =
	| { type: 'sit'; seat: number }
	| { type: 'leave-seat' }
	| { type: 'bet'; amount: number }
	| { type: 'clear-bet' }
	| { type: 'ready' }
	| { type: 'action'; action: PlayerAction }
	| { type: 'insurance'; accept: boolean }
	| { type: 'chat'; text: string };

/** Messages the server sends over a table socket. */
export type TableServerMessage =
	| { type: 'state'; table: TableView }
	| { type: 'chat'; message: ChatMessage }
	| { type: 'chat-history'; messages: ChatMessage[] }
	| { type: 'balance'; balance: number }
	| { type: 'error'; message: string }
	| { type: 'closed' };

/** Messages the server sends over the lobby socket. */
export interface LobbyServerMessage {
	type: 'tables';
	tables: TableSummary[];
}
