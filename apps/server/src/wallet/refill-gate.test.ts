import { describe, expect, it } from 'bun:test';
import type { Wallet } from '../game/model';
import { RefillGate } from './refill-gate';

/** A wallet whose calls finish only when the test says so. */
function slowWallet(): Wallet & { finish: () => void } {
	let pending: (() => void)[] = [];
	const later = <T>(value: T) => new Promise<T>((resolve) => pending.push(() => resolve(value)));
	return {
		debit: () => later(true),
		credit: () => later(undefined),
		finish: () => {
			pending.forEach((resolve) => resolve());
			pending = [];
		},
	};
}

const grant = async () => 'refilled';

describe('RefillGate', () => {
	it('refills when nothing is in play', async () => {
		const gate = new RefillGate(slowWallet(), () => 0);
		expect(await gate.refill(1, grant)).toBe('refilled');
	});

	it('refuses while the user has chips on a table', async () => {
		const gate = new RefillGate(slowWallet(), (userId) => (userId === 1 ? 25 : 0));
		expect(await gate.refill(1, grant)).toBeNull();
		expect(await gate.refill(2, grant)).toBe('refilled');
	});

	it('refuses while a bet or refund is still on its way', async () => {
		const wallet = slowWallet();
		const gate = new RefillGate(wallet, () => 0);
		const refund = gate.tableWallet.credit(1, 100);
		expect(await gate.refill(1, grant)).toBeNull();

		wallet.finish();
		await refund;
		await Bun.sleep(1);
		expect(await gate.refill(1, grant)).toBe('refilled');
	});

	it('refuses table bets while a refill is being granted', async () => {
		const gate = new RefillGate(slowWallet(), () => 0);
		let betDuringRefill: boolean | undefined;
		await gate.refill(1, async () => {
			betDuringRefill = await gate.tableWallet.debit(1, 5);
		});
		expect(betDuringRefill).toBe(false);
	});
});
