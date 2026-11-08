import { Hono } from 'hono';
import { requireAdmin, requireUser } from '../auth/session';
import { deletePlayer, leaderboard, listPlayers } from '../db/players.repo';
import type { AppEnv } from '../http/app-env';
import { disconnectUser } from '../realtime/hub';

/** How many players the lobby leaderboard shows. */
const LEADERBOARD_SIZE = 20;

/** The lobby leaderboard for everyone, and player management for admins. */
export const playerRoutes = new Hono<AppEnv>()
	.use(requireUser)
	.get('/leaderboard', async (c) => c.json(await leaderboard(LEADERBOARD_SIZE)))
	.get('/', requireAdmin, async (c) => c.json(await listPlayers()))
	.delete('/:id', requireAdmin, async (c) => {
		const id = Number(c.req.param('id'));
		if (!Number.isInteger(id)) {
			return c.json({ error: 'Player not found' }, 404);
		}
		if (id === c.get('user').id) {
			return c.json({ error: 'You cannot remove yourself' }, 400);
		}
		if (!(await deletePlayer(id))) {
			return c.json({ error: 'Player not found' }, 404);
		}
		disconnectUser(id);
		return c.body(null, 204);
	});
