import { afterEach, describe, expect, it } from 'bun:test';
import type { Card, Rank } from '@blackjack/shared/blackjack';
import type { TableServerMessage, TableView } from '@blackjack/shared/protocol';
import { gameConfig } from '../config';
import type { CardSource, Wallet } from './model';
import { TableRoom, type TableConnection } from './table-room';

const fastConfig = {
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

class MemoryWallet implements Wallet {
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

function player(id: number): TableConnection & { messages: TableServerMessage[] } {
	const messages: TableServerMessage[] = [];
	return { user: { id, username: `player${id}` }, messages, send: (message) => messages.push(message) };
}

interface Spy {
	messages: TableServerMessage[];
}

function states(connection: Spy): TableView[] {
	return connection.messages.flatMap((message) => (message.type === 'state' ? [message.table] : []));
}

function lastState(connection: Spy): TableView {
	return states(connection).at(-1) as TableView;
}

async function until(check: () => boolean): Promise<void> {
	for (let i = 0; i < 200 && !check(); i++) {
		await Bun.sleep(5);
	}
	expect(check()).toBe(true);
}

/** Waits until the table has been in `phase` and returns that snapshot. */
async function reached(connection: Spy, phase: TableView['phase']): Promise<TableView> {
	await until(() => states(connection).some((state) => state.phase === phase));
	return states(connection).findLast((state) => state.phase === phase) as TableView;
}

let room: TableRoom;
let wallet: MemoryWallet;

function setup(ranks: Rank[]): void {
	wallet = new MemoryWallet();
	room = new TableRoom(
		{ id: 't1', name: 'Test', minBet: 5, maxBet: 500 },
		{
			wallet,
			config: fastConfig,
			shoe: new StackedShoe(ranks),
			chat: { add: async () => 1, recent: async () => [] },
			onSeatsChanged: () => undefined,
		},
	);
}

async function seatAndBet(connection: TableConnection, seat: number, amount: number): Promise<void> {
	await room.join(connection);
	await room.handle(connection, { type: 'sit', seat });
	await room.handle(connection, { type: 'bet', amount });
}

afterEach(() => room.close());

describe('TableRoom', () => {
	it('starts at once for a lone player and pays a winning hand', async () => {
		setup(['10', '9', 'K', '8']);
		const alice = player(1);
		await seatAndBet(alice, 0, 25);
		await room.handle(alice, { type: 'ready' });
		await reached(alice, 'playing');

		await room.handle(alice, { type: 'action', action: 'stand' });
		const settled = await reached(alice, 'settled');

		expect(settled.seats[0]?.hands[0]?.result).toBe('win');
		expect(wallet.balances.get(1)).toBe(1025);
	});

	it('hides the hole card until the dealer plays', async () => {
		setup(['10', '9', 'K', '8']);
		const alice = player(1);
		await seatAndBet(alice, 0, 25);
		await room.handle(alice, { type: 'ready' });
		await reached(alice, 'playing');

		const [, hole] = (await reached(alice, 'playing')).dealer.cards;
		expect(hole).toMatchObject({ faceUp: false, rank: null });
	});

	it('gives other players a short countdown after the first ready', async () => {
		setup([]);
		const alice = player(1);
		const bob = player(2);
		await seatAndBet(alice, 0, 25);
		await room.join(bob);
		await room.handle(bob, { type: 'sit', seat: 1 });
		await room.handle(alice, { type: 'ready' });

		expect(lastState(alice).phase).toBe('betting');
		expect(lastState(alice).timer?.totalMs).toBe(fastConfig.firstBetMs);
		await reached(alice, 'playing');
		expect(lastState(alice).seats[1]?.hands).toHaveLength(0);
	});

	it('splits a pair into two hands and plays both', async () => {
		setup(['8', '10', '8', '7', '3', '2']);
		const alice = player(1);
		await seatAndBet(alice, 0, 25);
		await room.handle(alice, { type: 'ready' });
		await reached(alice, 'playing');

		await room.handle(alice, { type: 'action', action: 'split' });
		expect(lastState(alice).seats[0]?.hands).toHaveLength(2);
		expect(wallet.balances.get(1)).toBe(950);

		await room.handle(alice, { type: 'action', action: 'stand' });
		await until(() => lastState(alice).turn?.hand === 1);
	});

	it('doubles the bet and deals exactly one card', async () => {
		setup(['5', '10', '6', '7', '10']);
		const alice = player(1);
		await seatAndBet(alice, 0, 25);
		await room.handle(alice, { type: 'ready' });
		await reached(alice, 'playing');

		await room.handle(alice, { type: 'action', action: 'double' });
		const hand = (await reached(alice, 'settled')).seats[0]?.hands[0];
		expect(hand?.cards).toHaveLength(3);
		expect(hand?.result).toBe('win');
		expect(wallet.balances.get(1)).toBe(1050);
	});

	it('pays insurance 2:1 when the dealer has blackjack', async () => {
		setup(['10', 'A', '9', 'K']);
		const alice = player(1);
		await seatAndBet(alice, 0, 100);
		await room.handle(alice, { type: 'ready' });
		await reached(alice, 'insurance');

		await room.handle(alice, { type: 'insurance', accept: true });
		const settled = await reached(alice, 'settled');

		expect(settled.seats[0]?.hands[0]?.result).toBe('lose');
		expect(wallet.balances.get(1)).toBe(1000);
	});

	it('refunds bets when the table closes', async () => {
		setup([]);
		const alice = player(1);
		await seatAndBet(alice, 0, 25);
		expect(wallet.balances.get(1)).toBe(975);

		await room.close();
		expect(wallet.balances.get(1)).toBe(1000);
		expect(alice.messages.at(-1)).toEqual({ type: 'closed' });
	});
});
