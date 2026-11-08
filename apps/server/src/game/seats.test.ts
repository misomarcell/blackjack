import { afterEach, describe, expect, it } from 'bun:test';
import type { Rank } from '@blackjack/shared/blackjack';
import type { TableRoom } from './table-room';
import {
	createRoom,
	fastConfig,
	type HandCounts,
	lastState,
	type MemoryWallet,
	player,
	reached,
	seatAndBet,
	until,
} from './table-room.fixtures';

let room: TableRoom;
let wallet: MemoryWallet;
let hands: HandCounts;

function setup(ranks: Rank[]): void {
	({ room, wallet, hands } = createRoom(ranks));
}

afterEach(() => room.close());

describe('TableRoom seats', () => {
	it('lets one player hold several seats and play each hand', async () => {
		setup(['10', '10', '9', 'K', '8', '7']);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.handle(alice, { type: 'sit', seat: 2 });
		await room.handle(alice, { type: 'bet', seat: 2, amount: 25 });
		await room.handle(alice, { type: 'ready', seat: 0 });
		await room.handle(alice, { type: 'ready', seat: 2 });
		await reached(alice, 'playing');

		expect(lastState(alice).turn).toEqual({ seat: 0, hand: 0 });
		await room.handle(alice, { type: 'action', seat: 0, action: 'stand' });
		await until(() => lastState(alice).turn?.seat === 2);
		await room.handle(alice, { type: 'action', seat: 2, action: 'stand' });
		const settled = await reached(alice, 'settled');

		expect(settled.seats[0]?.hands[0]?.result).toBe('win');
		expect(settled.seats[2]?.hands[0]?.result).toBe('win');
		expect(wallet.balances.get(1)).toBe(1050);
	});

	it('counts every settled hand towards hands played, split hands included', async () => {
		setup(['8', '10', '8', '7', '3', '2']);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.handle(alice, { type: 'ready', seat: 0 });
		await reached(alice, 'playing');

		await room.handle(alice, { type: 'action', seat: 0, action: 'split' });
		await room.handle(alice, { type: 'action', seat: 0, action: 'stand' });
		await until(() => lastState(alice).turn?.hand === 1);
		await room.handle(alice, { type: 'action', seat: 0, action: 'stand' });
		await reached(alice, 'settled');

		expect(hands.get(1)).toBe(2);
	});

	it('waits for every seat, and lets a seat without chips sit the round out', async () => {
		setup([]);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.handle(alice, { type: 'sit', seat: 3 });
		await room.handle(alice, { type: 'ready', seat: 0 });
		expect(lastState(alice).phase).not.toBe('playing');

		await room.handle(alice, { type: 'ready', seat: 3 });
		const playing = await reached(alice, 'playing');
		expect(playing.seats[0]?.hands).toHaveLength(1);
		expect(playing.seats[3]?.hands).toHaveLength(0);
	});

	it('reports the chips a player has on the table, over all their seats', async () => {
		setup([]);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.handle(alice, { type: 'sit', seat: 3 });
		await room.handle(alice, { type: 'bet', seat: 3, amount: 100 });
		expect(room.moneyOf(1)).toBe(125);
		expect(room.moneyOf(2)).toBe(0);

		await room.handle(alice, { type: 'clear-bet', seat: 0 });
		await room.handle(alice, { type: 'clear-bet', seat: 3 });
		expect(room.moneyOf(1)).toBe(0);
	});

	it('only accepts moves for seats the player holds', async () => {
		setup([]);
		const alice = player(1);
		const bob = player(2);
		await seatAndBet(room, alice, 0, 25);
		await room.join(bob);
		await room.handle(bob, { type: 'bet', seat: 0, amount: 25 });

		expect(bob.messages.at(-1)).toEqual({ type: 'error', message: 'That is not your seat' });
		expect(lastState(alice).seats[0]?.bet).toBe(25);
	});

	it('gives a lone player unlimited time to bet', async () => {
		setup(['10', '9', 'K', '8']);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.handle(alice, { type: 'ready', seat: 0 });
		await reached(alice, 'playing');
		await room.handle(alice, { type: 'action', seat: 0, action: 'stand' });
		await until(() => lastState(alice).phase === 'betting');

		expect(lastState(alice).timer).toBeNull();

		const bob = player(2);
		await room.join(bob);
		await room.handle(bob, { type: 'sit', seat: 1 });
		expect(lastState(alice).timer?.totalMs).toBe(fastConfig.bettingMs);
	});
});
