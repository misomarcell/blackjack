import { afterEach, describe, expect, it } from 'bun:test';
import type { Rank } from '@blackjack/shared/blackjack';
import type { TableView } from '@blackjack/shared/protocol';
import type { TableRoom } from './table-room';
import {
	createRoom,
	lastState,
	type MemoryWallet,
	player,
	reached,
	seatAndBet,
	states,
} from './table-room.fixtures';

let room: TableRoom;
let wallet: MemoryWallet;

function setup(ranks: Rank[]): void {
	({ room, wallet } = createRoom(ranks));
}

afterEach(() => room.close());

describe('TableRoom rebet', () => {
	it('sets each seat to its exact amount and confirms it in one step', async () => {
		setup([]);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 100);
		await room.handle(alice, { type: 'sit', seat: 2 });
		await room.handle(alice, { type: 'rebet', seat: 0, amount: 25 });
		expect(lastState(alice).seats[0]).toMatchObject({ bet: 25, ready: true });

		await room.handle(alice, { type: 'rebet', seat: 2, amount: 0 });
		const playing = await reached(alice, 'playing');
		expect(playing.seats[0]?.hands[0]?.bet).toBe(25);
		expect(playing.seats[2]?.hands).toHaveLength(0);
		expect(wallet.balances.get(1)).toBe(975);
	});

	it('rejects amounts outside the table limits', async () => {
		setup([]);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.handle(alice, { type: 'rebet', seat: 0, amount: 501 });

		expect(alice.messages.at(-1)).toEqual({ type: 'error', message: 'Bets must be between $5 and $500' });
		expect(lastState(alice).seats[0]).toMatchObject({ bet: 25, ready: false });
	});
});

describe('TableRoom deal order', () => {
	it('ends the turn on a bust before the dealer turns the hole card over', async () => {
		setup(['10', '9', '6', '8', 'K']);
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.handle(alice, { type: 'ready', seat: 0 });
		await reached(alice, 'playing');

		await room.handle(alice, { type: 'action', seat: 0, action: 'hit' });
		await reached(alice, 'settled');

		const all = states(alice);
		const bust = all.findIndex((state) => state.seats[0]?.hands[0]?.status === 'bust');
		const revealed = all.findIndex((state: TableView) => state.dealer.cards[1]?.faceUp === true);
		expect(all[bust]?.dealer.cards[1]?.faceUp).toBe(false);
		expect(all.slice(bust, revealed).some((state) => state.turn === null)).toBe(true);
		expect(revealed).toBeGreaterThan(bust);
	});
});
