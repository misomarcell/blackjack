import { Hono } from 'hono';
import { requireUser } from '../auth/session';
import type { AppEnv } from '../http/app-env';
import { moneyOnTables } from '../realtime/hub';
import { withUserLock } from '../security/user-lock';
import { refill, refillStatus } from './wallet';

/**
 * Chips on a table still belong to the player, so "broke" means broke everywhere: otherwise a player could
 * park their money in bets, refill, and take the bets back. The check runs under the player's lock, so no
 * bet or refund of theirs is half done while it looks.
 */
function refillUnlessPlaying(userId: number): Promise<{ balance: number } | { error: string }> {
	return withUserLock(userId, async () =>
		moneyOnTables(userId) > 0
			? { error: 'Take your chips off the table before refilling' }
			: refill(userId),
	);
}

export const walletRoutes = new Hono<AppEnv>().post('/refill', requireUser, async (c) => {
	const userId = c.get('user').id;
	const outcome = await refillUnlessPlaying(userId);
	const status = await refillStatus(userId);
	return 'error' in outcome
		? c.json({ error: outcome.error, refill: status }, 400)
		: c.json({ balance: outcome.balance, refill: status });
});
