import { config } from '../config';
import type { RefillStatus } from '@blackjack/shared/protocol';
import { refillBalance, refillWaitMs } from '../db/players.repo';
import { creditBalance, debitBalance, getBalance } from '../db/users.repo';

type BalanceListener = (userId: number, balance: number) => void;

const listeners = new Set<BalanceListener>();

/** Lets realtime rooms push fresh balances to every socket of the user. */
export function onBalanceChange(listener: BalanceListener): void {
	listeners.add(listener);
}

async function publish(userId: number): Promise<number> {
	const balance = await getBalance(userId);
	listeners.forEach((listener) => listener(userId, balance));
	return balance;
}

export async function debit(userId: number, amount: number): Promise<boolean> {
	const ok = await debitBalance(userId, amount);
	if (ok) {
		await publish(userId);
	}
	return ok;
}

export async function credit(userId: number, amount: number): Promise<void> {
	if (amount <= 0) {
		return;
	}
	await creditBalance(userId, amount);
	await publish(userId);
}

/** When the user's next free refill is allowed, and how much it gives. */
export async function refillStatus(userId: number): Promise<RefillStatus> {
	return {
		waitMs: await refillWaitMs(userId, config.refillCooldownHours),
		upTo: config.startingBalance,
	};
}

/**
 * The free refill: tops the balance up to the starting balance, once per cooldown (24 hours by default).
 * Returns the new balance, or why it was refused.
 */
export async function refill(userId: number): Promise<{ balance: number } | { error: string }> {
	const { startingBalance, refillCooldownHours } = config;
	if (await refillBalance(userId, startingBalance, refillCooldownHours)) {
		return { balance: await publish(userId) };
	}
	if ((await refillWaitMs(userId, refillCooldownHours)) > 0) {
		return { error: 'You already had your free refill today' };
	}
	return { error: `Refills top you up to $${startingBalance}, and you already have that much` };
}
