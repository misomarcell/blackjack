import { websocket } from '@hono/bun';
import { app } from './app';
import { config } from './config';
import { migrate } from './db/migrate';

await migrate();

Bun.serve({ port: config.port, fetch: app.fetch, websocket });

console.info(`Blackjack server listening on http://localhost:${config.port}`);
