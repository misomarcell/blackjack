const tails = new Map<number, Promise<unknown>>();

/**
 * Runs `task` once every earlier task of the same user has finished, so one player's requests never
 * interleave around a wallet `await` (two bets passing the table maximum check, a refill sneaking in between
 * a debit and the bet it pays for, ...). Tasks of different users still run in parallel.
 */
export function withUserLock<T>(userId: number, task: () => Promise<T> | T): Promise<T> {
	const result = (tails.get(userId) ?? Promise.resolve()).then(task);
	const tail = result.catch(() => undefined);
	tails.set(userId, tail);
	void tail.then(() => {
		if (tails.get(userId) === tail) {
			tails.delete(userId);
		}
	});
	return result;
}
