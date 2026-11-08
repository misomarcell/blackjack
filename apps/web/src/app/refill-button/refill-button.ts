import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { apiErrorMessage, AuthStore } from '@blackjack/web/data-access';
import { formatCountdown, formatDollars } from '@blackjack/web/ui';

const TICK_MS = 1000;

/**
 * The once-a-day free refill in the app bar: a button while the player is broke and a refill is available,
 * then a countdown until the next one.
 */
@Component({
	selector: 'bj-refill-button',
	templateUrl: './refill-button.html',
	styleUrl: './refill-button.scss',
})
export class RefillButton {
	protected readonly auth = inject(AuthStore);
	private readonly now = signal(Date.now());

	protected readonly waitMs = computed(() => Math.max(0, this.auth.refillReadyAt() - this.now()));
	protected readonly countdown = computed(() => formatCountdown(this.waitMs()));
	/** Only broke players can refill, so the button never shows next to a playable balance. */
	protected readonly canRefill = computed(
		() => this.waitMs() === 0 && this.auth.balance() < this.auth.refillBrokeBelow(),
	);
	protected readonly upTo = computed(() => formatDollars(this.auth.refillUpTo()));
	protected readonly error = signal<string | null>(null);
	protected readonly busy = signal(false);

	constructor() {
		const tick = setInterval(() => this.now.set(Date.now()), TICK_MS);
		inject(DestroyRef).onDestroy(() => clearInterval(tick));
	}

	protected async refill(): Promise<void> {
		this.busy.set(true);
		try {
			await this.auth.refill();
			this.error.set(null);
		} catch (error) {
			this.error.set(apiErrorMessage(error));
		} finally {
			this.busy.set(false);
		}
	}
}
