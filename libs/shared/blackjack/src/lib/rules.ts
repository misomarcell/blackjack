import { type Rank, rankValue } from './card';
import { handTotal } from './hand';

type RankedCard = Readonly<{ rank: Rank }>;

/** A player may split up to three times, ending with at most four hands. */
const MAX_HANDS = 4;

export function canSplit(cards: readonly RankedCard[], handCount: number): boolean {
	const [first, second] = cards;
	return (
		cards.length === 2 &&
		first !== undefined &&
		second !== undefined &&
		rankValue(first.rank) === rankValue(second.rank) &&
		handCount < MAX_HANDS
	);
}

/** Double down is allowed on any first two cards, including after a split. */
export function canDouble(cards: readonly RankedCard[]): boolean {
	return cards.length === 2;
}

export function dealerShouldHit(cards: readonly RankedCard[], hitSoft17: boolean): boolean {
	const { total, soft } = handTotal(cards);
	return total < 17 || (hitSoft17 && total === 17 && soft);
}

export function offersInsurance(upcard: RankedCard): boolean {
	return upcard.rank === 'A';
}

/** The dealer checks the hole card for blackjack when showing an ace or a ten-value card. */
export function dealerPeeks(upcard: RankedCard): boolean {
	return rankValue(upcard.rank) >= 10;
}
