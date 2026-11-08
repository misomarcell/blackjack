import { type Card, type HandResult, isNatural } from '@blackjack/shared/blackjack';
import type { HandStatus, Phase, SeatPlayer, Turn } from '@blackjack/shared/protocol';
import { SEAT_COUNT } from '@blackjack/shared/protocol';
import type { TableRecord } from '../db/tables.repo';

/** Server-side game state for one table. Clients only ever see `toTableView` of it. */

export interface Hand {
	cards: Card[];
	bet: number;
	status: HandStatus;
	/** Split hands cannot be naturals, and split aces get a single card. */
	fromSplit: boolean;
	result: HandResult | null;
	payout: number | null;
}

export interface Seat {
	index: number;
	player: SeatPlayer | null;
	/** Chips placed for the next round, already taken from the wallet. */
	bet: number;
	ready: boolean;
	/** null = not decided yet, 0 = declined. */
	insurance: number | null;
	hands: Hand[];
	/** The player asked to leave while a round was running. */
	leaving: boolean;
}

export interface TableState {
	table: TableRecord;
	phase: Phase;
	round: number;
	seats: Seat[];
	dealer: { cards: Card[]; holeHidden: boolean };
	turn: Turn | null;
}

export interface CardSource {
	readonly needsShuffle: boolean;
	draw(): Card;
	shuffle(): void;
}

export interface Wallet {
	debit(userId: number, amount: number): Promise<boolean>;
	credit(userId: number, amount: number): Promise<void>;
}

/** Player statistics kept outside the game (the database in production). */
export interface PlayerStats {
	/** Every settled hand counts, so a split pair counts as two hands. */
	addHandsPlayed(userId: number, hands: number): Promise<void>;
}

function emptySeat(index: number): Seat {
	return { index, player: null, bet: 0, ready: false, insurance: null, hands: [], leaving: false };
}

export function createTableState(table: TableRecord): TableState {
	return {
		table,
		phase: 'idle',
		round: 0,
		seats: Array.from({ length: SEAT_COUNT }, (_, index) => emptySeat(index)),
		dealer: { cards: [], holeHidden: false },
		turn: null,
	};
}

export function newHand(cards: Card[], bet: number, fromSplit = false): Hand {
	return { cards, bet, status: 'playing', fromSplit, result: null, payout: null };
}

export function clearSeat(seat: Seat): void {
	Object.assign(seat, emptySeat(seat.index));
}

export function occupiedSeats(state: TableState): Seat[] {
	return state.seats.filter((seat) => seat.player !== null);
}

/** Seats dealt into the current round. */
export function playingSeats(state: TableState): Seat[] {
	return state.seats.filter((seat) => seat.hands.length > 0);
}

export function seatsOfUser(state: TableState, userId: number): Seat[] {
	return state.seats.filter((seat) => seat.player?.userId === userId);
}

/** How many different people sit at the table (one player can hold several seats). */
export function playerCount(state: TableState): number {
	return new Set(occupiedSeats(state).map((seat) => seat.player?.userId)).size;
}

/** Total money a seat has on the table right now, used for refunds. */
export function moneyOnTable(seat: Seat): number {
	const handBets = seat.hands.reduce((sum, hand) => sum + hand.bet, 0);
	return seat.bet + handBets + (seat.insurance ?? 0);
}

export function markNatural(hand: Hand | undefined): void {
	if (hand && isNatural(hand.cards)) {
		hand.status = 'blackjack';
	}
}

/** The dealer only draws when some player hand can still be beaten or pushed. */
export function needsDealer(hand: Hand): boolean {
	return hand.status !== 'bust' && hand.status !== 'blackjack';
}
