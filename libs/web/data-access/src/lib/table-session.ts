import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import type {
	ChatMessage,
	ClientMessage,
	HandView,
	TableServerMessage,
	TableView,
} from '@blackjack/shared/protocol';
import { AuthStore } from './auth.store';
import { LiveSocket } from './live-socket';

const CHAT_LIMIT = 100;

/** One player's live connection to a table. Provide it on the table page. */
@Service({ autoProvided: false })
export class TableSession {
	private readonly auth = inject(AuthStore);
	private socket: LiveSocket<TableServerMessage, ClientMessage> | null = null;

	readonly table = signal<TableView | null>(null);
	/** When the last snapshot arrived, so countdowns can tick locally. */
	readonly receivedAt = signal(0);
	readonly chat = signal<ChatMessage[]>([]);
	readonly error = signal<{ message: string } | null>(null);
	readonly closed = signal(false);

	readonly mySeat = computed(() => {
		const userId = this.auth.user()?.id;
		return this.table()?.seats.find((seat) => seat.player?.userId === userId) ?? null;
	});

	/** The hand the viewer has to act on right now, if any. */
	readonly myTurnHand = computed<HandView | null>(() => {
		const table = this.table();
		const seat = this.mySeat();
		if (!table || !seat || table.phase !== 'playing' || table.turn?.seat !== seat.index) {
			return null;
		}
		return seat.hands[table.turn.hand] ?? null;
	});

	constructor() {
		inject(DestroyRef).onDestroy(() => this.socket?.close());
	}

	connect(tableId: string): void {
		this.socket?.close();
		this.socket = new LiveSocket(`/ws/tables/${encodeURIComponent(tableId)}`, (message) =>
			this.receive(message),
		);
		this.socket.open();
	}

	send(message: ClientMessage): void {
		this.socket?.send(message);
	}

	private receive(message: TableServerMessage): void {
		switch (message.type) {
			case 'state':
				this.table.set(message.table);
				this.receivedAt.set(performance.now());
				break;
			case 'chat':
				this.chat.update((messages) => [...messages, message.message].slice(-CHAT_LIMIT));
				break;
			case 'chat-history':
				this.chat.set(message.messages);
				break;
			case 'balance':
				this.auth.setBalance(message.balance);
				break;
			case 'error':
				this.error.set({ message: message.message });
				break;
			case 'closed':
				this.closed.set(true);
				this.socket?.close();
		}
	}
}
