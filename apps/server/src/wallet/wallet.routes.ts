import { Hono } from 'hono';
import { requireUser } from '../auth/session';
import type { AppEnv } from '../http/app-env';
import { refill } from './wallet';

export const walletRoutes = new Hono<AppEnv>().post('/refill', requireUser, async (c) => {
	const balance = await refill(c.get('user').id);
	if (balance === null) {
		return c.json({ error: 'Refills are only for empty wallets' }, 400);
	}
	return c.json({ balance });
});
