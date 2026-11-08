import { Component, computed, input, output } from '@angular/core';
import type { SeatView } from '@blackjack/shared/protocol';
import { formatDollars, Icon } from '@blackjack/web/ui';

/** One seat's stake to put back down (0 sits the seat out). */
export interface SeatBet {
	seat: number;
	amount: number;
}

/**
 * "Repeat all & deal": one click puts last round's stake back on every open seat and confirms them.
 * A seat that sat out last round (or was taken since) sits out again.
 */
@Component({
	selector: 'bj-repeat-all',
	imports: [Icon],
	templateUrl: './repeat-all.html',
	styleUrl: './repeat-all.scss',
})
export class RepeatAll {
	/** The viewer's seats still waiting for a bet. */
	readonly seats = input.required<SeatView[]>();
	readonly lastBets = input.required<ReadonlyMap<number, number>>();
	readonly balance = input.required<number>();
	readonly repeat = output<SeatBet[]>();

	protected readonly bets = computed<SeatBet[]>(() =>
		this.seats().map((seat) => ({ seat: seat.index, amount: this.lastBets().get(seat.index) ?? 0 })),
	);
	protected readonly total = computed(() => this.bets().reduce((sum, bet) => sum + bet.amount, 0));
	/** Chips already down on these seats come back first, so they count towards the balance. */
	protected readonly affordable = computed(() => {
		const onTable = this.seats().reduce((sum, seat) => sum + seat.bet, 0);
		return this.total() <= this.balance() + onTable;
	});
	protected readonly dollars = formatDollars;
}
