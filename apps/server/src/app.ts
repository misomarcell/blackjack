import { serveStatic } from '@hono/bun';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { authRoutes } from './auth/auth.routes';
import { config } from './config';
import { playerRoutes } from './players/players.routes';
import { sameOriginOnly } from './security/request-origin';
import { wsRoutes } from './realtime/ws.routes';
import { tableRoutes } from './tables/tables.routes';
import { walletRoutes } from './wallet/wallet.routes';

/**
 * Only our own scripts, styles (Angular injects component styles), audio, images and sockets. PixiJS loads
 * textures from blob: URLs and needs no eval.
 */
const contentSecurityPolicy = {
	defaultSrc: ["'self'"],
	scriptSrc: ["'self'"],
	styleSrc: ["'self'", "'unsafe-inline'"],
	imgSrc: ["'self'", 'data:', 'blob:'],
	fontSrc: ["'self'", 'data:'],
	mediaSrc: ["'self'", 'blob:'],
	connectSrc: ["'self'"],
	workerSrc: ["'self'", 'blob:'],
	objectSrc: ["'none'"],
	baseUri: ["'self'"],
	formAction: ["'self'"],
	frameAncestors: ["'none'"],
};

/** JSON bodies are tiny; anything bigger is refused before it is parsed. */
const MAX_BODY_BYTES = 16 * 1024;

/** HTTP API, WebSocket endpoints and the built Angular app, all on one origin. */
export const app = new Hono()
	.use(logger())
	.use(secureHeaders({ contentSecurityPolicy }))
	.use('/api/*', sameOriginOnly, bodyLimit({ maxSize: MAX_BODY_BYTES }))
	.use('/ws/*', sameOriginOnly)
	.get('/api/health', (c) => c.json({ ok: true }))
	.route('/api/auth', authRoutes)
	.route('/api/wallet', walletRoutes)
	.route('/api/tables', tableRoutes)
	.route('/api/players', playerRoutes)
	.all('/api/*', (c) => c.json({ error: 'Not found' }, 404))
	.route('/ws', wsRoutes)
	.use('/*', serveStatic({ root: config.staticDir }))
	.get('*', serveStatic({ path: `${config.staticDir}/index.html` }))
	.onError((error, c) => {
		if (error instanceof HTTPException) {
			return c.json(
				{ error: error.status === 413 ? 'Request too large' : error.message },
				error.status,
			);
		}
		console.error(error);
		return c.json({ error: 'Something went wrong' }, 500);
	});
