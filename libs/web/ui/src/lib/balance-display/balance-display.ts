import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { countUp } from '../count-up';
import { formatDollars } from '../format';

const COUNT_MS = 1600;

/** A dollar balance that counts up or down, in whole dollars, to its new value. */
@Component({
	selector: 'bj-balance-display',
	templateUrl: './balance-display.html',
	styleUrl: './balance-display.scss',
	host: {
		'[class.rising]': "trend() === 'up'",
	},
})
export class BalanceDisplay {
	readonly amount = input.required<number>();

	private readonly shown = signal<number | null>(null);
	protected readonly trend = signal<'up' | 'down' | null>(null);
	protected readonly label = computed(() => formatDollars(Math.round((this.shown() ?? 0) * 100) / 100));

	constructor() {
		effect((onCleanup) => {
			const target = this.amount();
			const from = untracked(this.shown);
			if (from === null) {
				this.shown.set(target);
				return;
			}
			this.trend.set(target > from ? 'up' : 'down');
			// Whole dollars while counting; the exact amount (cents and all) once it lands.
			const cancel = countUp(from, target, COUNT_MS, (value) =>
				this.shown.set(value === target ? value : Math.round(value)),
			);
			const settle = setTimeout(() => this.trend.set(null), COUNT_MS);
			onCleanup(() => {
				cancel();
				clearTimeout(settle);
			});
		});
	}
}
