/**
 * Counts wallet calls still on their way to or from a table, per user. While a bet is being debited, or a
 * refund credited, the money is neither in the balance nor on a seat, so a refill must wait for it.
 */
export class InFlight {
	private readonly counts = new Map<number, number>();

	/** Runs a wallet call and counts it until the caller has had a chance to move the money onto a seat. */
	async track<T>(userId: number, work: () => Promise<T>): Promise<T> {
		this.counts.set(userId, (this.counts.get(userId) ?? 0) + 1);
		try {
			return await work();
		} finally {
			// The caller resumes on a microtask (e.g. `seat.bet += amount` after the debit), so release on the
			// next macrotask, after it.
			setTimeout(() => this.release(userId), 0);
		}
	}

	has(userId: number): boolean {
		return (this.counts.get(userId) ?? 0) > 0;
	}

	private release(userId: number): void {
		const left = (this.counts.get(userId) ?? 1) - 1;
		if (left > 0) {
			this.counts.set(userId, left);
		} else {
			this.counts.delete(userId);
		}
	}
}
