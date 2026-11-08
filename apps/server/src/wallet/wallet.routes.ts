import { Hono } from 'hono';
import { requireUser } from '../auth/session';
import type { AppEnv } from '../http/app-env';
import { refill, refillStatus } from './wallet';

export const walletRoutes = new Hono<AppEnv>().post('/refill', requireUser, async (c) => {
	const userId = c.get('user').id;
	const outcome = await refill(userId);
	const status = await refillStatus(userId);
	return 'error' in outcome
		? c.json({ error: outcome.error, refill: status }, 400)
		: c.json({ balance: outcome.balance, refill: status });
});
