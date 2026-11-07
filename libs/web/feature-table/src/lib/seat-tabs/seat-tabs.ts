import { Component, input, output } from '@angular/core';
import type { SeatView } from '@blackjack/shared/protocol';
import { formatDollars } from '@blackjack/web/ui';

/** Picks which of the viewer's seats the chips go to, when they hold more than one. */
@Component({
	selector: 'bj-seat-tabs',
	templateUrl: './seat-tabs.html',
	styleUrl: './seat-tabs.scss',
})
export class SeatTabs {
	readonly seats = input.required<SeatView[]>();
	/** Index of the seat taking chips now. */
	readonly selected = input.required<number>();
	readonly picked = output<number>();

	protected readonly dollars = formatDollars;
}
