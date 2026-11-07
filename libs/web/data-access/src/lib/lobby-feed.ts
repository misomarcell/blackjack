import { DestroyRef, inject, Service, signal } from '@angular/core';
import type { LobbyServerMessage, TableSummary } from '@blackjack/shared/protocol';
import { LiveSocket } from './live-socket';

/** Live table catalog with player counts. Provide it on the component that shows the list. */
@Service({ autoProvided: false })
export class LobbyFeed {
	private readonly socket = new LiveSocket<LobbyServerMessage, never>('/ws/lobby', (message) =>
		this.tables.set(message.tables),
	);

	readonly tables = signal<TableSummary[] | null>(null);

	constructor() {
		this.socket.open();
		inject(DestroyRef).onDestroy(() => this.socket.close());
	}
}
