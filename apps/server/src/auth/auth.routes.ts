import { zValidator } from '@hono/zod-validator';
import type { User } from '@blackjack/shared/protocol';
import { Hono } from 'hono';
import { z } from 'zod';
import { config } from '../config';
import {
	createUser,
	findUserById,
	findUserByUsername,
	isUsernameOrEmailTaken,
	type UserRecord,
} from '../db/users.repo';
import type { AppEnv } from '../http/app-env';
import { validationHook } from '../http/validation';
import { endSession, requireUser, startSession } from './session';

const username = z
	.string()
	.trim()
	.min(3, 'Username needs at least 3 characters')
	.max(24, 'Username can have at most 24 characters')
	.regex(/^[\p{L}\p{N}_.-]+$/u, 'Use letters, numbers, dots, dashes or underscores');
const password = z.string().min(8, 'Password needs at least 8 characters').max(128);

const registerSchema = z.object({ username, password, email: z.email('Enter a valid e-mail').max(254) });
const loginSchema = z.object({ username: z.string().trim(), password: z.string() });

/** Strips the password hash before a user leaves the server. */
function publicUser({ passwordHash: _hash, ...user }: UserRecord): User {
	return user;
}

export const authRoutes = new Hono<AppEnv>()
	.post('/register', zValidator('json', registerSchema, validationHook), async (c) => {
		const input = c.req.valid('json');
		if (await isUsernameOrEmailTaken(input.username, input.email)) {
			return c.json({ error: 'That username or e-mail is already registered' }, 409);
		}
		const id = await createUser({
			username: input.username,
			email: input.email,
			passwordHash: await Bun.password.hash(input.password),
			balance: config.startingBalance,
			isAdmin: input.username === config.adminUsername,
		});
		await startSession(c, id);
		const user = await findUserById(id);
		return c.json(publicUser(user as UserRecord), 201);
	})
	.post('/login', zValidator('json', loginSchema, validationHook), async (c) => {
		const input = c.req.valid('json');
		const user = await findUserByUsername(input.username);
		const valid = user !== null && (await Bun.password.verify(input.password, user.passwordHash));
		if (!valid) {
			return c.json({ error: 'Wrong username or password' }, 401);
		}
		await startSession(c, user.id);
		return c.json(publicUser(user));
	})
	.post('/logout', (c) => {
		endSession(c);
		return c.body(null, 204);
	})
	.get('/me', requireUser, (c) => c.json(publicUser(c.get('user'))));
