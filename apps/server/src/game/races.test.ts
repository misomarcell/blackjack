import { afterEach, describe, expect, it } from 'bun:test';
import type { Rank } from '@blackjack/shared/blackjack';
import type { TableRoom } from './table-room';
import {
	createRoom,
	fastConfig,
	lastState,
	type MemoryWallet,
	player,
	reached,
	seatAndBet,
	until,
} from './table-room.fixtures';

/** Players fire messages faster than the wallet answers; none of that may bend the rules or make money. */

let room: TableRoom;
let wallet: MemoryWallet;

function setup(ranks: Rank[], config = fastConfig): void {
	({ room, wallet } = createRoom(ranks, config));
}

/** Makes the wallet slow to debit one user, like a busy database. */
function slowDebit(userId: number, ms: number): void {
	const debit = wallet.debit.bind(wallet);
	wallet.debit = async (id, amount) => {
		if (id === userId) {
			await Bun.sleep(ms);
		}
		return debit(id, amount);
	};
}

afterEach(() => room.close());

describe('TableRoom races', () => {
	it('keeps simultaneous bets under the table maximum', async () => {
		setup([]);
		const alice = player(1);
		await room.join(alice);
		await room.handle(alice, { type: 'sit', seat: 0 });

		await Promise.all([
			room.handle(alice, { type: 'bet', seat: 0, amount: 500 }),
			room.handle(alice, { type: 'bet', seat: 0, amount: 500 }),
		]);

		expect(lastState(alice).seats[0]?.bet).toBe(500);
		expect(wallet.balances.get(1)).toBe(500);
	});

	it('refunds an under-minimum bet only once when the player leaves while it is refunded', async () => {
		setup([]);
		room.configure({ id: 't1', name: 'Test', minBet: 25, maxBet: 500 });
		const alice = player(1);
		const bob = player(2);
		await seatAndBet(room, alice, 0, 25);
		await seatAndBet(room, bob, 1, 5);
		const credit = wallet.credit.bind(wallet);
		wallet.credit = async (id, amount) => {
			if (id === 2) {
				void room.handle(bob, { type: 'leave-seat', seat: 1 });
				await Bun.sleep(5);
			}
			return credit(id, amount);
		};

		await room.handle(alice, { type: 'ready', seat: 0 });
		await reached(alice, 'playing');
		await until(() => lastState(alice).seats[1]?.player === null);

		expect(wallet.balances.get(2)).toBe(1000);
	});

	it('does not end the next player’s turn when a slow double lands after a timeout', async () => {
		// Alice 5+6, Bob 10+7, dealer 10+8.
		setup(['5', '10', '10', '6', '7', '8'], { ...fastConfig, turnMs: 100 });
		const alice = player(1);
		const bob = player(2);
		await seatAndBet(room, alice, 0, 25);
		await seatAndBet(room, bob, 1, 25);
		await room.handle(alice, { type: 'ready', seat: 0 });
		await room.handle(bob, { type: 'ready', seat: 1 });
		await reached(alice, 'playing');
		slowDebit(1, 150);

		await room.handle(alice, { type: 'action', seat: 0, action: 'double' });
		await room.handle(bob, { type: 'action', seat: 1, action: 'stand' });

		expect(bob.messages.filter((message) => message.type === 'error')).toEqual([]);
	});

	it('hands back insurance that was paid after the insurance window closed', async () => {
		// Alice 10+9, dealer A+K: the dealer has blackjack.
		setup(['10', 'A', '9', 'K'], { ...fastConfig, insuranceMs: 50 });
		const alice = player(1);
		await seatAndBet(room, alice, 0, 25);
		await room.handle(alice, { type: 'ready', seat: 0 });
		await reached(alice, 'insurance');
		slowDebit(1, 100);

		await room.handle(alice, { type: 'insurance', seat: 0, accept: true });
		await reached(alice, 'settled');

		expect(wallet.balances.get(1)).toBe(975);
		expect(room.moneyOf(1)).toBe(0);
	});
});
