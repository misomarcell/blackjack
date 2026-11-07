import type { TableView } from '@blackjack/shared/protocol';
import type { CardTarget } from './card-layer';
import { dealerCardPosition, handOrigin, handScale, playerCardPosition } from './layout';

/** Where every card in the snapshot belongs on the table. */
export function cardTargets(table: TableView): CardTarget[] {
	const dealerCards = table.dealer.cards;
	const dealer = dealerCards.map((card, index) => ({
		card,
		...dealerCardPosition(index, dealerCards.length),
		scale: 1,
	}));
	const players = table.seats.flatMap((seat) =>
		seat.hands.flatMap((hand, handIndex) => {
			const origin = handOrigin(seat.index, handIndex, seat.hands.length);
			const scale = handScale(seat.hands.length);
			return hand.cards.map((card, index) => ({
				card,
				...playerCardPosition(origin, index, scale),
				scale,
			}));
		}),
	);
	return [...dealer, ...players];
}
