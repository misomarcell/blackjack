import { Component, computed, input, output } from '@angular/core';
import { CHIP_VALUES } from '@blackjack/shared/protocol';
import { formatDollars } from '@blackjack/web/ui';

/** Chip buttons with a clear / repeat-last-bet chip, and "Place bet", while bets are open. */
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
	/** The stake of the viewer's previous round, 0 when there is none. */
	readonly lastBet = input(0);

	readonly chip = output<number>();
	readonly clear = output();
	readonly ready = output();

	protected readonly chips = CHIP_VALUES;
	protected readonly dollars = formatDollars;

	/** Offered while no chips are down yet. */
	protected readonly showRepeat = computed(() => this.bet() === 0 && this.lastBet() > 0);
	protected readonly canRepeat = computed(() => {
		const last = this.lastBet();
		return last <= this.balance() && last <= this.maxBet() && last >= this.minBet();
	});

	/** Puts the previous stake back down as chips, largest first. */
	protected repeat(): void {
		let rest = this.lastBet();
		for (const value of [...CHIP_VALUES].reverse()) {
			for (; rest >= value; rest -= value) {
				this.chip.emit(value);
			}
		}
	}

	protected canAdd(value: number): boolean {
		return value <= this.balance() && this.bet() + value <= this.maxBet();
	}
}
