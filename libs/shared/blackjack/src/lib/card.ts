export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

/** A dealt card. `seq` is the draw order, which clients use to replay deal animations in order. */
export interface Card {
	readonly id: string;
	readonly seq: number;
	readonly rank: Rank;
	readonly suit: Suit;
}

const FACE_RANKS: readonly Rank[] = ['J', 'Q', 'K'];

/** Blackjack value of a rank. Aces count as 11 here; `handTotal` softens them when needed. */
export function rankValue(rank: Rank): number {
	if (rank === 'A') {
		return 11;
	}
	return FACE_RANKS.includes(rank) ? 10 : Number(rank);
}
