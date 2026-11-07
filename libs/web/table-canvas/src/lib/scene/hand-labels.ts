import type { HandResult } from '@blackjack/shared/blackjack';
import type { HandView } from '@blackjack/shared/protocol';
import { formatDollars } from '@blackjack/web/ui';
import { colors } from './palette';

export interface HandLabel {
	text: string;
	fill: number;
	textColor: number;
}

const RESULT_LABELS: Record<HandResult, (gain: number) => HandLabel> = {
	blackjack: (gain) => ({
		text: `BLACKJACK +${formatDollars(gain)}`,
		fill: colors.yellow,
		textColor: colors.ink,
	}),
	win: (gain) => ({ text: `WIN +${formatDollars(gain)}`, fill: colors.green, textColor: colors.ink }),
	push: () => ({ text: 'PUSH', fill: colors.sky, textColor: colors.white }),
	lose: () => ({ text: 'LOSE', fill: colors.red, textColor: colors.white }),
	bust: () => ({ text: 'BUST', fill: colors.red, textColor: colors.white }),
};

/** "7/17" for soft hands, so players see both ways an ace can count. */
function totalText(hand: HandView): string {
	return hand.soft && hand.total < 21 ? `${hand.total - 10}/${hand.total}` : String(hand.total);
}

/** The label above a hand: its total while playing, the outcome once settled. */
export function handLabel(hand: HandView, active: boolean): HandLabel {
	if (hand.result) {
		return RESULT_LABELS[hand.result]((hand.payout ?? 0) - hand.bet);
	}
	if (hand.status === 'bust') {
		return { text: `BUST ${hand.total}`, fill: colors.red, textColor: colors.white };
	}
	if (hand.status === 'blackjack') {
		return { text: 'BLACKJACK!', fill: colors.yellow, textColor: colors.ink };
	}
	return active
		? { text: totalText(hand), fill: colors.yellow, textColor: colors.ink }
		: { text: totalText(hand), fill: colors.sky, textColor: colors.white };
}
