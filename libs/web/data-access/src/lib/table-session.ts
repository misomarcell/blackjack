import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import type {
	ChatMessage,
	ClientMessage,
	HandView,
	LogEntry,
	TableServerMessage,
	TableView,
} from '@blackjack/shared/protocol';
import { AuthStore } from './auth.store';
import { LiveSocket } from './live-socket';

const CHAT_LIMIT = 100;
const LOG_LIMIT = 100;
/** Log lines wait until the cards they describe have landed on screen, so they never spoil a card. */
const LOG_DELAY_MS = 700;

type ServerHandlers = {
	[Type in TableServerMessage['type']]: (message: Extract<TableServerMessage, { type: Type }>) => void;
};

/** One player's live connection to a table. Provide it on the table page. */
@Service({ autoProvided: false })
export class TableSession {
	private readonly auth = inject(AuthStore);
	private socket: LiveSocket<TableServerMessage, ClientMessage> | null = null;

	readonly table = signal<TableView | null>(null);
	/** When the last snapshot arrived, so countdowns can tick locally. */
	readonly receivedAt = signal(0);
	readonly chat = signal<ChatMessage[]>([]);
	readonly log = signal<LogEntry[]>([]);
	readonly error = signal<{ message: string } | null>(null);
	readonly closed = signal(false);
	/** What the viewer bet in their last round, for the "repeat bet" button. */
	readonly lastBet = signal(0);
	private lastBetRound = 0;

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

	/** What each server message does to the session. */
	private readonly handlers: ServerHandlers = {
		state: ({ table }) => {
			this.table.set(table);
			this.rememberBet();
			this.receivedAt.set(performance.now());
		},
		chat: ({ message }) => this.chat.update((messages) => [...messages, message].slice(-CHAT_LIMIT)),
		'chat-history': ({ messages }) => this.chat.set(messages),
		log: ({ entry }) => {
			setTimeout(() => this.addLogEntry(entry), LOG_DELAY_MS);
		},
		'log-history': ({ entries }) => this.log.set(entries),
		balance: ({ balance }) => this.auth.setBalance(balance),
		error: ({ message }) => this.error.set({ message }),
		closed: () => {
			this.closed.set(true);
			this.socket?.close();
		},
	};

	/** Skips lines the joining history already contained. */
	private addLogEntry(entry: LogEntry): void {
		this.log.update((entries) =>
			entries.some((known) => known.id === entry.id) ? entries : [...entries, entry].slice(-LOG_LIMIT),
		);
	}

	/** The stake of the viewer's first hand, as dealt (before any double or split). */
	private rememberBet(): void {
		const round = this.table()?.round ?? 0;
		const stake = this.mySeat()?.hands[0]?.bet;
		if (stake && round !== this.lastBetRound) {
			this.lastBetRound = round;
			this.lastBet.set(stake);
		}
	}

	private receive(message: TableServerMessage): void {
		(this.handlers[message.type] as (message: TableServerMessage) => void)(message);
	}
}
