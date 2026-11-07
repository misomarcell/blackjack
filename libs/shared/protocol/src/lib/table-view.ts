import type { HandResult, Rank, Suit } from '@blackjack/shared/blackjack';

/** Table seat count and the chip denominations players can bet with. */
export const SEAT_COUNT = 6;
export const CHIP_VALUES = [5, 25, 100, 500] as const;
export const CHAT_MAX_LENGTH = 200;

export type Phase = 'idle' | 'betting' | 'dealing' | 'insurance' | 'playing' | 'dealer' | 'settled';

/** A card as seen by clients. Face-down cards have no rank or suit, so the hole card stays secret. */
export interface CardView {
	id: string;
	seq: number;
	faceUp: boolean;
	rank: Rank | null;
	suit: Suit | null;
}

export type HandStatus = 'playing' | 'stood' | 'bust' | 'blackjack' | 'doubled';

export interface HandView {
	cards: CardView[];
	bet: number;
	total: number;
	soft: boolean;
	status: HandStatus;
	result: HandResult | null;
	payout: number | null;
}

export interface SeatPlayer {
	userId: number;
	username: string;
	connected: boolean;
}

export interface SeatView {
	index: number;
	player: SeatPlayer | null;
	/** Chips placed for the next round. */
	bet: number;
	ready: boolean;
	insurance: number | null;
	hands: HandView[];
}

interface DealerView {
	cards: CardView[];
	/** Total of the visible cards only. */
	total: number | null;
}

export interface Turn {
	seat: number;
	hand: number;
}

/** Countdown, relative to when the snapshot was sent, so client clocks do not matter. */
export interface TimerView {
	remainingMs: number;
	totalMs: number;
}

export interface TableView {
	id: string;
	name: string;
	minBet: number;
	maxBet: number;
	phase: Phase;
	round: number;
	seats: SeatView[];
	dealer: DealerView;
	turn: Turn | null;
	timer: TimerView | null;
}
