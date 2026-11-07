import { Component, input, output } from '@angular/core';
import { CHIP_VALUES } from '@blackjack/shared/protocol';
import { formatDollars } from '@blackjack/web/ui';

/** Chip buttons, clear and "deal me in" while bets are open. */
@Component({
	selector: 'bj-bet-panel',
	templateUrl: './bet-panel.html',
	styleUrl: './bet-panel.scss',
})
export class BetPanel {
	readonly bet = input.required<number>();
	readonly balance = input.required<number>();
	readonly minBet = input.required<number>();
	readonly maxBet = input.required<number>();

	readonly chip = output<number>();
	readonly clear = output();
	readonly ready = output();

	protected readonly chips = CHIP_VALUES;
	protected readonly dollars = formatDollars;

	protected canAdd(value: number): boolean {
		return value <= this.balance() && this.bet() + value <= this.maxBet();
	}
}
