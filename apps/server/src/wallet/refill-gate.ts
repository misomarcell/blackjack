import type { Wallet } from '../game/model';
import { InFlight } from './in-flight';

/**
 * Keeps refills honest: a refill is only granted while the user has no chips on any table and no money moving
 * between their wallet and a table, and their table bets are refused while it is being granted. Otherwise
 * chips could be parked on a table, the empty wallet refilled, and the chips taken back.
 */
export class RefillGate {
	private readonly inFlight = new InFlight();
	private readonly refilling = new Set<number>();

	/** The wallet the tables use: every call is counted while under way, and bets wait out a refill. */
	readonly tableWallet: Wallet = {
		debit: async (userId, amount) =>
			!this.refilling.has(userId) &&
			(await this.inFlight.track(userId, () => this.wallet.debit(userId, amount))),
		credit: (userId, amount) => this.inFlight.track(userId, () => this.wallet.credit(userId, amount)),
	};

	constructor(
		private readonly wallet: Wallet,
		/** Chips the user has on all tables together. */
		private readonly chipsOnTables: (userId: number) => number,
	) {}

	/** Runs `grant` when nothing is in play. Returns null (and grants nothing) when something is. */
	async refill<T>(userId: number, grant: () => Promise<T>): Promise<T | null> {
		if (this.refilling.has(userId) || this.inFlight.has(userId) || this.chipsOnTables(userId) > 0) {
			return null;
		}
		this.refilling.add(userId);
		try {
			return await grant();
		} finally {
			this.refilling.delete(userId);
		}
	}
}
