import type { HandResult } from '@blackjack/shared/blackjack';
import type { HandView, TableView } from '@blackjack/shared/protocol';
import type { SceneSounds } from './sounds';

/** Net money a settled hand made: positive won, negative lost, 0 pushed. */
function net(hand: HandView): number {
	return (hand.payout ?? 0) - hand.bet;
}

/** The one sound for a round's total: win, lose or push (and blackjack when one paid for the win). */
function overallResult(hands: HandView[]): HandResult {
	const total = hands.reduce((sum, hand) => sum + net(hand), 0);
	if (total > 0) {
		return hands.some((hand) => hand.result === 'blackjack') ? 'blackjack' : 'win';
	}
	return total < 0 ? 'lose' : 'push';
}

/**
 * Plays a single result sound per round for the viewer, based on the sum over all their hands and seats,
 * so a lost $50 hand and a won $125 hand sound like one win.
 */
export class RoundSound {
	private playedRound = -1;

	constructor(private readonly sounds: SceneSounds) {}

	play(table: TableView, viewerId: number | null): void {
		if (table.phase !== 'settled' || this.playedRound === table.round) {
			return;
		}
		const hands = table.seats
			.filter((seat) => seat.player !== null && seat.player.userId === viewerId)
			.flatMap((seat) => seat.hands);
		if (hands.length === 0 || hands.some((hand) => hand.result === null)) {
			return;
		}
		this.playedRound = table.round;
		this.sounds.result(overallResult(hands));
	}
}
