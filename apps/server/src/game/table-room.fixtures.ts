import { expect } from 'bun:test';
import type { Card, Rank } from '@blackjack/shared/blackjack';
import type { LogEntry, TableServerMessage, TableView } from '@blackjack/shared/protocol';
import { gameConfig } from '../config';
import type { CardSource, Wallet } from './model';
import type { LogStore } from './table-log';
import { TableRoom, type TableConnection } from './table-room';

/** Shared helpers for the TableRoom tests: a stacked shoe, an in-memory wallet and socket spies. */

export const fastConfig = {
	...gameConfig,
	dealMs: 0,
	resultsMs: 0,
	firstBetMs: 60,
	bettingMs: 5000,
	insuranceMs: 5000,
	turnMs: 5000,
};

/** Deals the given ranks in order, then tens forever. */
class StackedShoe implements CardSource {
	readonly needsShuffle = false;
	private seq = 0;

	constructor(private readonly ranks: Rank[]) {}

	draw(): Card {
		this.seq++;
		return { id: `c${this.seq}`, seq: this.seq, rank: this.ranks.shift() ?? '10', suit: 'spades' };
	}

	shuffle(): void {
		// Stacked on purpose.
	}
}

export class MemoryWallet implements Wallet {
	readonly balances = new Map<number, number>([
		[1, 1000],
		[2, 1000],
	]);

	async debit(userId: number, amount: number): Promise<boolean> {
		const balance = this.balances.get(userId) ?? 0;
		if (balance < amount) {
			return false;
		}
		this.balances.set(userId, balance - amount);
		return true;
	}

	async credit(userId: number, amount: number): Promise<void> {
		this.balances.set(userId, (this.balances.get(userId) ?? 0) + amount);
	}
}

export function player(id: number): TableConnection & { messages: TableServerMessage[] } {
	const messages: TableServerMessage[] = [];
	return { user: { id, username: `player${id}` }, messages, send: (message) => messages.push(message) };
}

export interface Spy {
	messages: TableServerMessage[];
}

function states(connection: Spy): TableView[] {
	return connection.messages.flatMap((message) => (message.type === 'state' ? [message.table] : []));
}

/** The table log as plain lines, e.g. "player1 hits on 12". */
export function logLines(connection: Spy): string[] {
	return connection.messages.flatMap((message) =>
		message.type === 'log' ? [message.entry.parts.map((part) => part.text).join('')] : [],
	);
}

export function lastState(connection: Spy): TableView {
	return states(connection).at(-1) as TableView;
}

export async function until(check: () => boolean): Promise<void> {
	for (let i = 0; i < 200 && !check(); i++) {
		await Bun.sleep(5);
	}
	expect(check()).toBe(true);
}

/** Waits until the table has been in `phase` and returns that snapshot. */
export async function reached(connection: Spy, phase: TableView['phase']): Promise<TableView> {
	await until(() => states(connection).some((state) => state.phase === phase));
	return states(connection).findLast((state) => state.phase === phase) as TableView;
}

/** Keeps log lines in memory with increasing ids, like the database would. */
function memoryLog(): LogStore {
	const entries: LogEntry[] = [];
	return {
		add: async (_tableId, parts) => entries.push({ id: entries.length + 1, parts }),
		recent: async () => [...entries],
	};
}

/** A fresh room for one test, dealing `ranks` first. */
export function createRoom(ranks: Rank[]): { room: TableRoom; wallet: MemoryWallet } {
	const wallet = new MemoryWallet();
	const room = new TableRoom(
		{ id: 't1', name: 'Test', minBet: 5, maxBet: 500 },
		{
			wallet,
			config: fastConfig,
			shoe: new StackedShoe(ranks),
			chat: { add: async () => 1, recent: async () => [] },
			log: memoryLog(),
			onSeatsChanged: () => undefined,
		},
	);
	return { room, wallet };
}

/** Joins, sits down at `seat` and puts `amount` on it. */
export async function seatAndBet(
	room: TableRoom,
	connection: TableConnection,
	seat: number,
	amount: number,
): Promise<void> {
	await room.join(connection);
	await room.handle(connection, { type: 'sit', seat });
	await room.handle(connection, { type: 'bet', seat, amount });
}
