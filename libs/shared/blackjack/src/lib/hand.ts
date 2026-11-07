import { type Rank, rankValue } from './card';

type RankedCard = Readonly<{ rank: Rank }>;

export interface HandTotal {
	total: number;
	/** True when an ace is still counted as 11. */
	soft: boolean;
}

export function handTotal(cards: readonly RankedCard[]): HandTotal {
	let total = 0;
	let softAces = 0;
	for (const card of cards) {
		total += rankValue(card.rank);
		softAces += card.rank === 'A' ? 1 : 0;
	}
	while (total > 21 && softAces > 0) {
		total -= 10;
		softAces--;
	}
	return { total, soft: softAces > 0 };
}

export function isBust(cards: readonly RankedCard[]): boolean {
	return handTotal(cards).total > 21;
}

/** Two-card 21. Callers must not treat split hands as naturals. */
export function isNatural(cards: readonly RankedCard[]): boolean {
	return cards.length === 2 && handTotal(cards).total === 21;
}
