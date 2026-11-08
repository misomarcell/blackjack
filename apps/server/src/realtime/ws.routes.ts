import { upgradeWebSocket } from '@hono/bun';
import type { LobbyServerMessage, TableServerMessage } from '@blackjack/shared/protocol';
import { Hono } from 'hono';
import type { WSContext } from 'hono/ws';
import { requireUser } from '../auth/session';
import type { UserRecord } from '../db/users.repo';
import type { Connection } from '../game/connection';
import type { TableRoom } from '../game/table-room';
import type { AppEnv } from '../http/app-env';
import { parseClientMessage } from './client-message';
import { joinLobby, leaveLobby, openRoom } from './hub';

interface RoomEnv extends AppEnv {
	Variables: AppEnv['Variables'] & { room: TableRoom };
}

function connectionFor<Message>(ws: WSContext, user: UserRecord): Connection<Message> {
	return {
		user: { id: user.id, username: user.username },
		send: (message) => ws.send(JSON.stringify(message)),
		close: () => ws.close(),
	};
}

const lobbySocket = upgradeWebSocket((c) => {
	let connection: Connection<LobbyServerMessage> | null = null;
	return {
		onOpen: (_event, ws) => {
			connection = connectionFor(ws, c.get('user'));
			void joinLobby(connection);
		},
		onClose: () => connection && leaveLobby(connection),
	};
});

const tableSocket = upgradeWebSocket((c) => {
	const room: TableRoom = c.get('room');
	let connection: Connection<TableServerMessage> | null = null;
	return {
		onOpen: (_event, ws) => {
			connection = connectionFor(ws, c.get('user'));
			void room.join(connection);
		},
		onMessage: (event) => {
			const message = parseClientMessage(event.data);
			if (connection && message) {
				void room.handle(connection, message);
			}
		},
		onClose: () => connection && void room.leave(connection),
	};
});

export const wsRoutes = new Hono<RoomEnv>()
	.use(requireUser)
	.get('/lobby', lobbySocket)
	.get(
		'/tables/:id',
		async (c, next) => {
			const room = await openRoom(c.req.param('id'));
			if (!room) {
				return c.json({ error: 'Table not found' }, 404);
			}
			c.set('room', room);
			return next();
		},
		tableSocket,
	);
