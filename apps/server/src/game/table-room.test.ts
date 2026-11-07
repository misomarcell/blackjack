import { afterEach, describe, expect, it } from 'bun:test';
import type { Rank } from '@blackjack/shared/blackjack';
import type { TableRoom } from './table-room';
import {
	createRoom,
	fastConfig,
	lastState,
	logLines,
	type MemoryWallet,
	player,
	reached,
	seatAndBet,
	until,
} from './table-room.fixtures';

let room: TableRoom;
let wallet: MemoryWallet;

function setup(ranks: Rank[]): void {
	({ room, wallet } = createRoom(ranks));
}

afterEach(() => room.close());

describe('TableRoom', () => {
	it('starts at once for a lone player and pays a winning hand', async () => {
		setup(['10', '9', 'K', '8']);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.handle(alice, { type: 'ready', seat: 0 });
		await reached(alice, 'playing');

		await room.handle(alice, { type: 'action', seat: 0, action: 'stand' });
		const settled = await reached(alice, 'settled');

		expect(settled.seats[0]?.hands[0]?.result).toBe('win');
		expect(wallet.balances.get(1)).toBe(1025);
	});

	it('hides the hole card until the dealer plays', async () => {
		setup(['10', '9', 'K', '8']);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.handle(alice, { type: 'ready', seat: 0 });
		await reached(alice, 'playing');

		const [, hole] = (await reached(alice, 'playing')).dealer.cards;
		expect(hole).toMatchObject({ faceUp: false, rank: null });
	});

	it('gives other players a short countdown after the first ready', async () => {
		setup([]);
		const alice = player(1);
		const bob = player(2);
		await seatAndBet(room, alice, 0, 25);
		await room.join(bob);
		await room.handle(bob, { type: 'sit', seat: 1 });
		await room.handle(alice, { type: 'ready', seat: 0 });

		expect(lastState(alice).phase).toBe('betting');
		expect(lastState(alice).timer?.totalMs).toBe(fastConfig.firstBetMs);
		await reached(alice, 'playing');
		expect(lastState(alice).seats[1]?.hands).toHaveLength(0);
	});

	it('splits a pair into two hands and plays both', async () => {
		setup(['8', '10', '8', '7', '3', '2']);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.handle(alice, { type: 'ready', seat: 0 });
		await reached(alice, 'playing');

		await room.handle(alice, { type: 'action', seat: 0, action: 'split' });
		expect(lastState(alice).seats[0]?.hands).toHaveLength(2);
		expect(wallet.balances.get(1)).toBe(950);

		await room.handle(alice, { type: 'action', seat: 0, action: 'stand' });
		await until(() => lastState(alice).turn?.hand === 1);
	});

	it('doubles the bet and deals exactly one card', async () => {
		setup(['5', '10', '6', '7', '10']);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.handle(alice, { type: 'ready', seat: 0 });
		await reached(alice, 'playing');

		await room.handle(alice, { type: 'action', seat: 0, action: 'double' });
		const hand = (await reached(alice, 'settled')).seats[0]?.hands[0];
		expect(hand?.cards).toHaveLength(3);
		expect(hand?.result).toBe('win');
		expect(wallet.balances.get(1)).toBe(1050);
	});

	it('pays insurance 2:1 when the dealer has blackjack', async () => {
		setup(['10', 'A', '9', 'K']);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 100);
		await room.handle(alice, { type: 'ready', seat: 0 });
		await reached(alice, 'insurance');

		await room.handle(alice, { type: 'insurance', seat: 0, accept: true });
		const settled = await reached(alice, 'settled');

		expect(settled.seats[0]?.hands[0]?.result).toBe('lose');
		expect(wallet.balances.get(1)).toBe(1000);
	});

	it('logs bets, moves, dealer hits and results', async () => {
		setup(['10', '6', '2', '6', '5', 'K']);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.handle(alice, { type: 'ready', seat: 0 });
		await reached(alice, 'playing');

		await room.handle(alice, { type: 'action', seat: 0, action: 'hit' });
		await room.handle(alice, { type: 'action', seat: 0, action: 'stand' });
		await reached(alice, 'settled');
		await room.log.flushed();

		expect(logLines(alice)).toEqual([
			'player1 sits down',
			'player1 bets $25',
			'Round 1 is dealt',
			'player1 hits on 12',
			'player1 stands on 17',
			'Dealer turns over 12',
			'Dealer hits on 12',
			'Dealer busts with 22',
			'player1 wins $25 with 17',
		]);
	});

	it('sends saved log lines to players who join later', async () => {
		setup([]);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.log.flushed();

		const bob = player(2);
		await room.join(bob);
		const history = bob.messages.find((message) => message.type === 'log-history');
		expect(history).toEqual({
			type: 'log-history',
			entries: [
				{
					id: 1,
					parts: [
						{ tone: 'player', text: 'player1' },
						{ tone: 'text', text: ' sits down' },
					],
				},
			],
		});
	});

	it('refunds bets when the table closes', async () => {
		setup([]);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		expect(wallet.balances.get(1)).toBe(975);

		await room.close();
		expect(wallet.balances.get(1)).toBe(1000);
		expect(alice.messages.at(-1)).toEqual({ type: 'closed' });
	});
});
