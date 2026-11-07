import { type Card, handTotal } from '@blackjack/shared/blackjack';
import type { PlayerAction } from '@blackjack/shared/protocol';
import type { Hand, Seat } from './model';
import { dealerName, type LogFragment, money, type TableLog, total, value, who } from './table-log';

/** The log lines for a round: what players and the dealer did, and how each hand ended. */

const ACTION_VERBS: Record<PlayerAction, string> = {
	hit: ' hits on ',
	stand: ' stands on ',
	double: ' doubles down on ',
	split: ' splits on ',
};

/** Logs a move, described by the hand as it was before the move, plus a bust it caused. */
export function logAction(
	log: TableLog,
	seat: Seat,
	hand: Hand,
	move: { action: PlayerAction; before: Card[] },
): void {
	log.add(who(seat), ACTION_VERBS[move.action], total(move.before));
	if (hand.status === 'bust') {
		log.add(who(seat), ' busts with ', total(hand.cards));
	}
}

export function logInsurance(log: TableLog, seat: Seat): void {
	if (seat.insurance) {
		log.add(who(seat), ' takes insurance for ', money(seat.insurance));
	} else {
		log.add(who(seat), ' declines insurance');
	}
}

export function logDealerDone(log: TableLog, cards: Card[]): void {
	const bust = handTotal(cards).total > 21;
	log.add(dealerName, bust ? ' busts with ' : ' stands on ', total(cards));
}

function resultLine(seat: Seat, hand: Hand, dealerText: LogFragment): LogFragment[] {
	const gain = (hand.payout ?? 0) - hand.bet;
	switch (hand.result) {
		case 'blackjack':
			return [who(seat), ' wins ', money(gain), ' with ', value('blackjack')];
		case 'win':
			return [who(seat), ' wins ', money(gain), ' with ', total(hand.cards)];
		case 'push':
			return [who(seat), ' pushes with ', total(hand.cards)];
		case 'bust':
			return [who(seat), ' loses ', money(hand.bet), ' on a bust'];
		default:
			return [dealerName, ' wins with ', dealerText, ' against ', who(seat), ' ', money(-hand.bet)];
	}
}

/** One line per settled hand, plus the insurance payout. */
export function logSettlement(log: TableLog, seat: Seat, dealerCards: Card[], dealerNatural: boolean): void {
	const dealerText = dealerNatural ? value('blackjack') : total(dealerCards);
	seat.hands.forEach((hand) => log.add(...resultLine(seat, hand, dealerText)));
	if (seat.insurance && dealerNatural) {
		log.add(who(seat), '’s insurance pays ', money(seat.insurance * 2));
	}
}
