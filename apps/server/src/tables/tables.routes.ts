import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { requireAdmin, requireUser } from '../auth/session';
import { createTable, deleteTable, findTable, updateTable } from '../db/tables.repo';
import type { AppEnv } from '../http/app-env';
import { validationHook } from '../http/validation';
import { closeRoom, reconfigureRoom, refreshLobby, tableSummaries } from '../realtime/hub';

const tableSchema = z
	.object({
		name: z.string().trim().min(2, 'Name needs at least 2 characters').max(40),
		minBet: z.number().int().min(5, 'Minimum bet is at least $5'),
		maxBet: z.number().int().max(100_000),
	})
	.refine((table) => table.maxBet >= table.minBet, 'Max bet must be at least the min bet');

/** Short, URL-friendly id used in shareable table links. */
function newTableId(): string {
	return crypto.randomUUID().replaceAll('-', '').slice(0, 8);
}

export const tableRoutes = new Hono<AppEnv>()
	.use(requireUser)
	.get('/', async (c) => c.json(await tableSummaries()))
	.get('/:id', async (c) => {
		const table = await findTable(c.req.param('id'));
		return table ? c.json(table) : c.json({ error: 'Table not found' }, 404);
	})
	.post('/', requireAdmin, zValidator('json', tableSchema, validationHook), async (c) => {
		const table = { id: newTableId(), ...c.req.valid('json') };
		await createTable(table);
		refreshLobby();
		return c.json(table, 201);
	})
	.put('/:id', requireAdmin, zValidator('json', tableSchema, validationHook), async (c) => {
		const table = { id: c.req.param('id'), ...c.req.valid('json') };
		if (!(await updateTable(table))) {
			return c.json({ error: 'Table not found' }, 404);
		}
		reconfigureRoom(table);
		return c.json(table);
	})
	.delete('/:id', requireAdmin, async (c) => {
		const id = c.req.param('id');
		await closeRoom(id);
		if (!(await deleteTable(id))) {
			return c.json({ error: 'Table not found' }, 404);
		}
		return c.body(null, 204);
	});
