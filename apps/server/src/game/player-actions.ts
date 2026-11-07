import { canDouble, canSplit, handTotal, isBust } from '@blackjack/shared/blackjack';
import type { PlayerAction } from '@blackjack/shared/protocol';
import { type CardSource, type Hand, newHand, type Seat, type Wallet } from './model';

/** `continue`: same player acts again, `done`: hand finished, otherwise an error for the player. */
export type ActionOutcome = 'continue' | 'done' | { error: string };

export interface ActionContext {
	seat: Seat;
	hand: Hand;
	shoe: CardSource;
	wallet: Wallet;
}

function finishIfOver(hand: Hand): ActionOutcome {
	const { total } = handTotal(hand.cards);
	if (total > 21) {
		hand.status = 'bust';
	} else if (total === 21) {
		hand.status = 'stood';
	}
	return hand.status === 'playing' ? 'continue' : 'done';
}

function hit({ hand, shoe }: ActionContext): ActionOutcome {
	hand.cards.push(shoe.draw());
	return finishIfOver(hand);
}

function stand({ hand }: ActionContext): ActionOutcome {
	hand.status = 'stood';
	return 'done';
}

async function double({ seat, hand, shoe, wallet }: ActionContext): Promise<ActionOutcome> {
	if (!canDouble(hand.cards)) {
		return { error: 'You can only double on your first two cards' };
	}
	if (!seat.player || !(await wallet.debit(seat.player.userId, hand.bet))) {
		return { error: 'Not enough balance to double' };
	}
	hand.bet *= 2;
	hand.cards.push(shoe.draw());
	hand.status = isBust(hand.cards) ? 'bust' : 'doubled';
	return 'done';
}

async function split({ seat, hand, shoe, wallet }: ActionContext): Promise<ActionOutcome> {
	if (!canSplit(hand.cards, seat.hands.length)) {
		return { error: 'Only pairs can be split' };
	}
	if (!seat.player || !(await wallet.debit(seat.player.userId, hand.bet))) {
		return { error: 'Not enough balance to split' };
	}
	const [first, second] = hand.cards as [Hand['cards'][0], Hand['cards'][0]];
	const sibling = newHand([second, shoe.draw()], hand.bet, true);
	hand.cards = [first, shoe.draw()];
	hand.fromSplit = true;
	seat.hands.splice(seat.hands.indexOf(hand) + 1, 0, sibling);
	if (first.rank === 'A') {
		hand.status = 'stood';
		sibling.status = 'stood';
		return 'done';
	}
	return finishIfOver(hand);
}

export const playerActions: Record<
	PlayerAction,
	(ctx: ActionContext) => ActionOutcome | Promise<ActionOutcome>
> = {
	hit,
	stand,
	double,
	split,
};
