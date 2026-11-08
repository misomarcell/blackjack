import { computed, DestroyRef, effect, inject, Service, signal } from '@angular/core';
import type {
	ChatMessage,
	ClientMessage,
	HandView,
	LogEntry,
	SeatView,
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
	/** What each of the viewer's seats staked last round (0 = sat out), for the repeat buttons. */
	readonly lastBets = signal<ReadonlyMap<number, number>>(new Map());
	private lastBetRound = 0;

	/** Every seat the viewer holds (a player can sit in several). */
	readonly mySeats = computed<SeatView[]>(() => {
		const userId = this.auth.user()?.id;
		return this.table()?.seats.filter((seat) => seat.player?.userId === userId) ?? [];
	});

	/** The viewer's seat whose hand is in turn, if any. */
	readonly myTurnSeat = computed<SeatView | null>(() => {
		const table = this.table();
		if (table?.phase !== 'playing' || !table.turn) {
			return null;
		}
		const turnSeat = table.turn.seat;
		return this.mySeats().find((seat) => seat.index === turnSeat) ?? null;
	});

	/** The hand the viewer has to act on right now, if any. */
	readonly myTurnHand = computed<HandView | null>(() => {
		const hand = this.table()?.turn?.hand ?? 0;
		return this.myTurnSeat()?.hands[hand] ?? null;
	});

	/** Bets, hands and insurance the viewer has on this table, over all their seats. */
	readonly chipsInPlay = computed(() =>
		this.mySeats().reduce(
			(sum, seat) =>
				sum + seat.bet + (seat.insurance ?? 0) + seat.hands.reduce((all, hand) => all + hand.bet, 0),
			0,
		),
	);

	constructor() {
		// The app bar offers a refill only when nothing is left on the table either.
		effect(() => this.auth.chipsInPlay.set(this.chipsInPlay()));
		inject(DestroyRef).onDestroy(() => {
			this.socket?.close();
			this.auth.chipsInPlay.set(0);
		});
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
			this.rememberBets();
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

	/** Each seat's stake as dealt (before any double or split), once per round the viewer played. */
	private rememberBets(): void {
		const round = this.table()?.round ?? 0;
		const seats = this.mySeats();
		if (round === this.lastBetRound || !seats.some((seat) => seat.hands.length > 0)) {
			return;
		}
		this.lastBetRound = round;
		this.lastBets.set(new Map(seats.map((seat) => [seat.index, seat.hands[0]?.bet ?? 0])));
	}

	private receive(message: TableServerMessage): void {
		(this.handlers[message.type] as (message: TableServerMessage) => void)(message);
	}
}
