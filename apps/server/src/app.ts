import { serveStatic } from '@hono/bun';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { authRoutes } from './auth/auth.routes';
import { config } from './config';
import { wsRoutes } from './realtime/ws.routes';
import { tableRoutes } from './tables/tables.routes';
import { walletRoutes } from './wallet/wallet.routes';

/** HTTP API, WebSocket endpoints and the built Angular app, all on one origin. */
export const app = new Hono()
	.use(logger())
	.use(secureHeaders({ contentSecurityPolicy: undefined }))
	.get('/api/health', (c) => c.json({ ok: true }))
	.route('/api/auth', authRoutes)
	.route('/api/wallet', walletRoutes)
	.route('/api/tables', tableRoutes)
	.all('/api/*', (c) => c.json({ error: 'Not found' }, 404))
	.route('/ws', wsRoutes)
	.use('/*', serveStatic({ root: config.staticDir }))
	.get('*', serveStatic({ path: `${config.staticDir}/index.html` }))
	.onError((error, c) => {
		console.error(error);
		return c.json({ error: 'Something went wrong' }, 500);
	});
