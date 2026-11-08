import { Shoe } from '@blackjack/shared/blackjack';
import type { ChatMessage, ClientMessage, TableServerMessage } from '@blackjack/shared/protocol';
import type { GameConfig } from '../config';
import type { TableRecord } from '../db/tables.repo';
import { Betting } from './betting';
import type { Connection } from './connection';
import { Countdown } from './countdown';
import {
	type CardSource,
	createTableState,
	moneyOnTable,
	occupiedSeats,
	type Seat,
	type TableState,
	type Wallet,
} from './model';
import { Round, RoundAborted, type RoundContext } from './round';
import { Seating } from './seating';
import { type LogStore, TableLog } from './table-log';
import { toTableView } from './view';

export type TableConnection = Connection<TableServerMessage>;

interface ChatStore {
	add(tableId: string, userId: number, text: string): Promise<number>;
	recent(tableId: string): Promise<ChatMessage[]>;
}

export interface RoomDeps {
	wallet: Wallet;
	chat: ChatStore;
	log: LogStore;
	config: GameConfig;
	onSeatsChanged: () => void;
	shoe?: CardSource;
}

type SeatMessage = Exclude<ClientMessage, { type: 'sit' } | { type: 'chat' }>;
type HandlerResult = Promise<string | null> | string | null;
type SeatHandlers = {
	[Type in SeatMessage['type']]: (
		seat: Seat,
		message: Extract<SeatMessage, { type: Type }>,
	) => HandlerResult;
};

/** One live table: its sockets, seats and the round in progress. */
export class TableRoom implements RoundContext {
	readonly state: TableState;
	readonly countdown = new Countdown();
	readonly log: TableLog;
	readonly shoe: CardSource;
	readonly wallet: Wallet;
	readonly config: GameConfig;
	private readonly connections = new Set<TableConnection>();
	private readonly betting: Betting;
	private readonly seating: Seating;
	private round: Round | null = null;

	constructor(
		table: TableRecord,
		private readonly deps: RoomDeps,
	) {
		this.state = createTableState(table);
		this.wallet = deps.wallet;
		this.log = new TableLog(table.id, deps.log, (entry) => this.sendAll({ type: 'log', entry }));
		this.config = deps.config;
		this.shoe = deps.shoe ?? new Shoe(deps.config.decks);
		this.betting = new Betting(this, () => void this.startRound());
		this.seating = new Seating(this, this.betting, deps.onSeatsChanged);
	}

	get playerCount(): number {
		return occupiedSeats(this.state).length;
	}

	async join(connection: TableConnection): Promise<void> {
		this.connections.add(connection);
		await this.seating.setConnected(connection.user.id, true);
		connection.send({ type: 'state', table: toTableView(this.state, this.countdown.view()) });
		connection.send({ type: 'log-history', entries: await this.log.recent() });
		connection.send({ type: 'chat-history', messages: await this.deps.chat.recent(this.state.table.id) });
	}

	async leave(connection: TableConnection): Promise<void> {
		this.connections.delete(connection);
		const userId = connection.user.id;
		const stillHere = [...this.connections].some((other) => other.user.id === userId);
		if (!stillHere) {
			await this.seating.setConnected(userId, false);
		}
	}

	async handle(connection: TableConnection, message: ClientMessage): Promise<void> {
		const error = await this.dispatch(connection, message);
		if (error) {
			connection.send({ type: 'error', message: error });
		}
	}

	broadcast(): void {
		this.sendAll({ type: 'state', table: toTableView(this.state, this.countdown.view()) });
	}

	notifyBalance(userId: number, balance: number): void {
		this.connections.forEach((connection) => {
			if (connection.user.id === userId) {
				connection.send({ type: 'balance', balance });
			}
		});
	}

	configure(table: TableRecord): void {
		this.state.table = table;
		this.broadcast();
	}

	/** The table was deleted: refund everything still in play and tell everyone. */
	async close(): Promise<void> {
		this.round?.abort();
		this.countdown.cancel();
		await this.refundAll();
		this.sendAll({ type: 'closed' });
		this.connections.clear();
	}

	private dispatch(connection: TableConnection, message: ClientMessage): HandlerResult {
		if (message.type === 'chat') {
			return this.chat(connection, message.text);
		}
		if (message.type === 'sit') {
			return this.seating.sit(connection.user, message.seat);
		}
		const seat = this.state.seats[message.seat];
		return seat?.player?.userId === connection.user.id
			? this.handleSeatMessage(seat, message)
			: 'That is not your seat';
	}

	/** What each seated-player message does. */
	private readonly seatHandlers: SeatHandlers = {
		'leave-seat': (seat) => this.seating.leave(seat),
		bet: (seat, message) => this.betting.placeBet(seat, message.amount),
		'clear-bet': (seat) => this.betting.clearBet(seat),
		rebet: (seat, message) => this.betting.rebet(seat, message.amount),
		ready: (seat) => this.betting.ready(seat),
		action: (seat, message) =>
			this.round ? this.round.act(seat, message.action) : 'It is not your turn',
		insurance: (seat, message) =>
			this.round ? this.round.decideInsurance(seat, message.accept) : 'Insurance is not available',
	};

	private handleSeatMessage(seat: Seat, message: SeatMessage): HandlerResult {
		const handler = this.seatHandlers[message.type] as (
			seat: Seat,
			message: SeatMessage,
		) => HandlerResult;
		return handler(seat, message);
	}

	private async startRound(): Promise<void> {
		if (!this.betting.open) {
			return;
		}
		this.countdown.cancel();
		this.state.phase = 'dealing';
		if ((await this.betting.lockBets()) === 0) {
			this.state.phase = 'idle';
			this.broadcast();
			return;
		}
		this.state.round++;
		this.round = new Round(this);
		await this.playRound(this.round);
	}

	private async playRound(round: Round): Promise<void> {
		try {
			await round.play();
			this.finishRound();
		} catch (error) {
			if (!(error instanceof RoundAborted)) {
				console.error('Round failed, refunding bets', error);
				await this.refundAll();
				this.finishRound();
			}
		}
	}

	/** Returns every chip still on the table. Settled hands were already paid out. */
	private async refundAll(): Promise<void> {
		const settled = this.state.phase === 'settled';
		for (const seat of occupiedSeats(this.state)) {
			const refund = settled ? seat.bet : moneyOnTable(seat);
			if (seat.player) {
				await this.wallet.credit(seat.player.userId, refund);
			}
			seat.bet = 0;
		}
	}

	private finishRound(): void {
		this.round = null;
		this.state.dealer = { cards: [], holeHidden: false };
		this.state.turn = null;
		this.state.seats.forEach((seat) => {
			seat.hands = [];
			seat.insurance = null;
		});
		this.seating.removeAbsentPlayers();
		this.betting.openNextRound();
	}

	private async chat(connection: TableConnection, text: string): Promise<string | null> {
		const clean = text.trim();
		if (!clean) {
			return null;
		}
		const id = await this.deps.chat.add(this.state.table.id, connection.user.id, clean);
		const sentAt = new Date().toISOString();
		this.sendAll({
			type: 'chat',
			message: { id, username: connection.user.username, text: clean, sentAt },
		});
		return null;
	}

	private sendAll(message: TableServerMessage): void {
		this.connections.forEach((connection) => connection.send(message));
	}
}
