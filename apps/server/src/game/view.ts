import { type Card, handTotal } from '@blackjack/shared/blackjack';
import type { CardView, HandView, SeatView, TableView, TimerView } from '@blackjack/shared/protocol';
import type { Hand, Seat, TableState } from './model';

function cardView(card: Card, faceUp = true): CardView {
	return faceUp
		? { id: card.id, seq: card.seq, faceUp, rank: card.rank, suit: card.suit }
		: { id: card.id, seq: card.seq, faceUp, rank: null, suit: null };
}

function handView(hand: Hand): HandView {
	const { total, soft } = handTotal(hand.cards);
	return {
		cards: hand.cards.map((card) => cardView(card)),
		bet: hand.bet,
		total,
		soft,
		status: hand.status,
		result: hand.result,
		payout: hand.payout,
	};
}

function seatView(seat: Seat): SeatView {
	return {
		index: seat.index,
		player: seat.player,
		bet: seat.bet,
		ready: seat.ready,
		insurance: seat.insurance,
		hands: seat.hands.map(handView),
	};
}

function dealerView(state: TableState): TableView['dealer'] {
	const { cards, holeHidden } = state.dealer;
	const visible = holeHidden ? cards.slice(0, 1) : cards;
	return {
		cards: cards.map((card, index) => cardView(card, !(holeHidden && index === 1))),
		total: visible.length > 0 ? handTotal(visible).total : null,
	};
}

/** The public snapshot every client renders. The hidden hole card never leaves the server. */
export function toTableView(state: TableState, timer: TimerView | null): TableView {
	return {
		id: state.table.id,
		name: state.table.name,
		minBet: state.table.minBet,
		maxBet: state.table.maxBet,
		phase: state.phase,
		round: state.round,
		seats: state.seats.map(seatView),
		dealer: dealerView(state),
		turn: state.turn,
		timer,
	};
}
