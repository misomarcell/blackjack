import { CHIP_VALUES } from '@blackjack/shared/protocol';
import type { GameConfig } from '../config';
import type { Countdown } from './countdown';
import { newHand, occupiedSeats, playerCount, type Seat, type TableState, type Wallet } from './model';
import { money, type TableLog, who } from './table-log';

export interface BettingContext {
	readonly state: TableState;
	readonly wallet: Wallet;
	readonly config: GameConfig;
	readonly countdown: Countdown;
	readonly log: TableLog;
	broadcast(): void;
}

/**
 * Chips, the Ready button and the betting countdowns:
 * - the first Ready at an idle table starts a short countdown so others can join in,
 * - after each round everyone gets a longer betting window,
 * - the round starts early as soon as every seated player is ready,
 * - a player alone at the table gets no countdown at all and can take as long as they like.
 */
export class Betting {
	constructor(
		private readonly ctx: BettingContext,
		private readonly startRound: () => void,
	) {}

	get open(): boolean {
		return this.ctx.state.phase === 'idle' || this.ctx.state.phase === 'betting';
	}

	async placeBet(seat: Seat, amount: number): Promise<string | null> {
		const error = this.betError(seat, amount);
		const userId = seat.player?.userId;
		if (error !== null || userId === undefined) {
			return error;
		}
		if (!(await this.ctx.wallet.debit(userId, amount))) {
			return 'Not enough balance';
		}
		if (this.canStillBet(seat, userId)) {
			seat.bet += amount;
			this.ctx.broadcast();
			return null;
		}
		await this.ctx.wallet.credit(userId, amount);
		return 'Bets are closed';
	}

	async clearBet(seat: Seat): Promise<string | null> {
		if (!this.open || seat.ready || !seat.player) {
			return 'Bets are closed';
		}
		const refund = seat.bet;
		seat.bet = 0;
		await this.ctx.wallet.credit(seat.player.userId, refund);
		this.ctx.broadcast();
		return null;
	}

	ready(seat: Seat): string | null {
		const { minBet } = this.ctx.state.table;
		if (!this.open) {
			return 'Bets are closed';
		}
		if (seat.bet < minBet) {
			return `The minimum bet is $${minBet}`;
		}
		seat.ready = true;
		this.evaluate();
		return null;
	}

	/** Re-checks the countdown and early start after a Ready click or a seat change. */
	evaluate(): void {
		const { state, config } = this.ctx;
		if (!this.open) {
			return;
		}
		const wasIdle = state.phase === 'idle';
		if (this.everyoneReady()) {
			this.startRound();
			return;
		}
		if (occupiedSeats(state).length === 0) {
			state.phase = 'idle';
		} else if (state.phase === 'idle' && occupiedSeats(state).some((seat) => seat.ready)) {
			state.phase = 'betting';
		}
		this.updateCountdown(wasIdle ? config.firstBetMs : config.bettingMs);
		this.ctx.broadcast();
	}

	/** Opens the betting window after a round, or goes idle when nobody is seated. */
	openNextRound(): void {
		const { state } = this.ctx;
		state.phase = occupiedSeats(state).length > 0 ? 'betting' : 'idle';
		this.updateCountdown(this.ctx.config.bettingMs);
		this.ctx.broadcast();
	}

	/** Turns placed bets into hands and refunds bets under the minimum. Returns how many seats play. */
	async lockBets(): Promise<number> {
		const { state, wallet } = this.ctx;
		let players = 0;
		for (const seat of occupiedSeats(state)) {
			if (seat.bet >= state.table.minBet) {
				seat.hands = [newHand([], seat.bet)];
				this.ctx.log.add(who(seat), ' bets ', money(seat.bet));
				players++;
			} else if (seat.bet > 0 && seat.player) {
				await wallet.credit(seat.player.userId, seat.bet);
			}
			seat.bet = 0;
			seat.ready = false;
		}
		return players;
	}

	/** Betting is only timed while two or more people share the table. */
	private updateCountdown(ms: number): void {
		const { state, countdown } = this.ctx;
		if (state.phase !== 'betting' || playerCount(state) < 2) {
			countdown.cancel();
		} else if (!countdown.running) {
			countdown.start(ms, this.startRound);
		}
	}

	/**
	 * Every player has confirmed their bets. A player with several seats is done once a seat is ready
	 * and none of their other seats holds an unconfirmed stake (empty seats just sit the round out).
	 */
	private everyoneReady(): boolean {
		const { seats, table } = this.ctx.state;
		const seated = seats.filter((seat) => seat.player !== null);
		const readyPlayers = new Set(seated.filter((seat) => seat.ready).map((seat) => seat.player?.userId));
		return (
			seated.length > 0 &&
			seated.every(
				(seat) => seat.ready || (seat.bet < table.minBet && readyPlayers.has(seat.player?.userId)),
			)
		);
	}

	/** Bets can close or the player can leave while the wallet call is in flight. */
	private canStillBet(seat: Seat, userId: number): boolean {
		return this.open && seat.player?.userId === userId;
	}

	private betError(seat: Seat, amount: number): string | null {
		const { maxBet } = this.ctx.state.table;
		if (!seat.player) {
			return 'Take a seat first';
		}
		if (!this.open || seat.ready) {
			return 'Bets are closed';
		}
		if (!CHIP_VALUES.some((chip) => chip === amount)) {
			return 'Unknown chip';
		}
		return seat.bet + amount > maxBet ? `The table maximum is $${maxBet}` : null;
	}
}
