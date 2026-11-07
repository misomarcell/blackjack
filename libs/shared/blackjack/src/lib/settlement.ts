import type { Rank } from './card';
import { handTotal } from './hand';

type RankedCard = Readonly<{ rank: Rank }>;

export type HandResult = 'blackjack' | 'win' | 'push' | 'lose' | 'bust';

export interface SettleInput {
	cards: readonly RankedCard[];
	bet: number;
	/** Natural blackjack on an unsplit hand. */
	natural: boolean;
}

export interface Settlement {
	result: HandResult;
	/** Total amount returned to the player, stake included. */
	payout: number;
}

const PAYOUT_MULTIPLIER: Record<HandResult, number> = {
	blackjack: 2.5,
	win: 2,
	push: 1,
	lose: 0,
	bust: 0,
};

function resultOf(hand: SettleInput, dealerCards: readonly RankedCard[], dealerNatural: boolean): HandResult {
	const player = handTotal(hand.cards).total;
	if (player > 21) {
		return 'bust';
	}
	if (dealerNatural) {
		return hand.natural ? 'push' : 'lose';
	}
	if (hand.natural) {
		return 'blackjack';
	}
	const dealer = handTotal(dealerCards).total;
	if (dealer > 21 || player > dealer) {
		return 'win';
	}
	return player === dealer ? 'push' : 'lose';
}

export function settleHand(
	hand: SettleInput,
	dealerCards: readonly RankedCard[],
	dealerNatural: boolean,
): Settlement {
	const result = resultOf(hand, dealerCards, dealerNatural);
	return { result, payout: hand.bet * PAYOUT_MULTIPLIER[result] };
}

/** Insurance pays 2:1, so a winning side bet returns three times its stake. */
export function insurancePayout(insurance: number, dealerNatural: boolean): number {
	return dealerNatural ? insurance * 3 : 0;
}
