import { config } from '../config';
import { creditBalance, debitBalance, getBalance, setBalance } from '../db/users.repo';

type BalanceListener = (userId: number, balance: number) => void;

const listeners = new Set<BalanceListener>();

/** The smallest chip; below this a player is considered broke and may refill. */
const BROKE_BELOW = 5;

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

/** Free top-up back to the starting balance for players who went broke. */
export async function refill(userId: number): Promise<number | null> {
	if ((await getBalance(userId)) >= BROKE_BELOW) {
		return null;
	}
	await setBalance(userId, config.startingBalance);
	return publish(userId);
}
