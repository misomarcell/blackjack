import { websocket } from '@hono/bun';
import { app } from './app';
import { config } from './config';
import { migrate } from './db/migrate';

await migrate();

/** Client frames are small JSON intents (a chat line is at most 200 characters). */
const MAX_FRAME_BYTES = 4 * 1024;

Bun.serve({
	port: config.port,
	fetch: app.fetch,
	maxRequestBodySize: 64 * 1024,
	websocket: { ...websocket, maxPayloadLength: MAX_FRAME_BYTES },
});

console.info(`Blackjack server listening on http://localhost:${config.port}`);
