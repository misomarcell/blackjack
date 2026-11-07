import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import type { TimerView } from '@blackjack/shared/protocol';

const TICK_MS = 200;

/** A ring countdown driven by a server timer snapshot and ticking locally between snapshots. */
@Component({
	selector: 'bj-countdown',
	templateUrl: './countdown.html',
	styleUrl: './countdown.scss',
})
export class Countdown {
	readonly timer = input<TimerView | null>(null);
	/** `performance.now()` when the snapshot carrying `timer` arrived. */
	readonly receivedAt = input(0);

	private readonly now = signal(performance.now());

	private readonly remainingMs = computed(() => {
		const timer = this.timer();
		return timer ? Math.max(0, timer.remainingMs - (this.now() - this.receivedAt())) : 0;
	});

	protected readonly seconds = computed(() => Math.ceil(this.remainingMs() / 1000));
	protected readonly progress = computed(() => this.remainingMs() / (this.timer()?.totalMs ?? 1));
	protected readonly urgent = computed(() => this.seconds() <= 5);

	constructor() {
		const tick = setInterval(() => this.now.set(performance.now()), TICK_MS);
		inject(DestroyRef).onDestroy(() => clearInterval(tick));
	}
}
