import { type LobbyServerMessage, SEAT_COUNT, type TableSummary } from '@blackjack/shared/protocol';
import { gameConfig } from '../config';
import { addChatMessage, recentChatMessages } from '../db/chat.repo';
import { addLogEntry, recentLogEntries } from '../db/log.repo';
import { findTable, listTables, type TableRecord } from '../db/tables.repo';
import type { Connection } from '../game/connection';
import { TableRoom } from '../game/table-room';
import { credit, debit, onBalanceChange } from '../wallet/wallet';

type LobbyConnection = Connection<LobbyServerMessage>;

const rooms = new Map<string, TableRoom>();
const lobbyConnections = new Set<LobbyConnection>();
let lobbyRefreshQueued = false;

/** The table catalog with live player counts. */
export async function tableSummaries(): Promise<TableSummary[]> {
	const tables = await listTables();
	return tables.map((table) => ({
		...table,
		players: rooms.get(table.id)?.playerCount ?? 0,
		seats: SEAT_COUNT,
	}));
}

/** Pushes fresh player counts to everyone in the lobby, batching bursts of seat changes. */
export function refreshLobby(): void {
	if (lobbyRefreshQueued) {
		return;
	}
	lobbyRefreshQueued = true;
	setTimeout(async () => {
		lobbyRefreshQueued = false;
		const message: LobbyServerMessage = { type: 'tables', tables: await tableSummaries() };
		lobbyConnections.forEach((connection) => connection.send(message));
	}, 50);
}

export async function joinLobby(connection: LobbyConnection): Promise<void> {
	lobbyConnections.add(connection);
	connection.send({ type: 'tables', tables: await tableSummaries() });
}

export function leaveLobby(connection: LobbyConnection): void {
	lobbyConnections.delete(connection);
}

/** Returns the live room for a table, creating it on first visit. Null when the table does not exist. */
export async function openRoom(tableId: string): Promise<TableRoom | null> {
	const existing = rooms.get(tableId);
	if (existing) {
		return existing;
	}
	const table = await findTable(tableId);
	if (!table) {
		return null;
	}
	const room =
		rooms.get(tableId) ??
		new TableRoom(table, {
			wallet: { debit, credit },
			chat: { add: addChatMessage, recent: recentChatMessages },
			log: { add: addLogEntry, recent: recentLogEntries },
			config: gameConfig,
			onSeatsChanged: refreshLobby,
		});
	rooms.set(tableId, room);
	return room;
}

export function reconfigureRoom(table: TableRecord): void {
	rooms.get(table.id)?.configure(table);
	refreshLobby();
}

export async function closeRoom(tableId: string): Promise<void> {
	await rooms.get(tableId)?.close();
	rooms.delete(tableId);
	refreshLobby();
}

onBalanceChange((userId, balance) => rooms.forEach((room) => room.notifyBalance(userId, balance)));
