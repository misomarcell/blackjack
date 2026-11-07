import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { sign, verify } from 'hono/jwt';
import { config } from '../config';
import { findUserById, type UserRecord } from '../db/users.repo';
import type { AppEnv } from '../http/app-env';

const COOKIE_NAME = 'bj_session';
const SESSION_SECONDS = 60 * 60 * 24 * 14;

export async function startSession(c: Context, userId: number): Promise<void> {
	const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
	const token = await sign({ sub: userId, exp }, config.jwtSecret, 'HS256');
	setCookie(c, COOKIE_NAME, token, {
		httpOnly: true,
		sameSite: 'Lax',
		secure: config.cookieSecure,
		path: '/',
		maxAge: SESSION_SECONDS,
	});
}

export function endSession(c: Context): void {
	deleteCookie(c, COOKIE_NAME, { path: '/' });
}

/** Resolves the signed-in user from the session cookie, or null. */
async function currentUser(c: Context): Promise<UserRecord | null> {
	const token = getCookie(c, COOKIE_NAME);
	if (!token) {
		return null;
	}
	try {
		const { sub } = await verify(token, config.jwtSecret, 'HS256');
		return await findUserById(Number(sub));
	} catch {
		return null;
	}
}

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
	const user = await currentUser(c);
	if (!user) {
		return c.json({ error: 'Please sign in first' }, 401);
	}
	c.set('user', user);
	return next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
	if (!c.get('user').isAdmin) {
		return c.json({ error: 'Only admins can do that' }, 403);
	}
	return next();
});
