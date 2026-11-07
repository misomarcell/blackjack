import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { apiErrorMessage, AuthStore } from '@blackjack/web/data-access';
import { BalanceDisplay } from '@blackjack/web/ui';

/** Smallest chip; below it a player can top up for free. */
const MIN_CHIP = 5;

@Component({
	selector: 'bj-top-bar',
	imports: [RouterLink, RouterLinkActive, BalanceDisplay],
	templateUrl: './top-bar.html',
	styleUrl: './top-bar.scss',
})
export class TopBar {
	private readonly router = inject(Router);
	protected readonly auth = inject(AuthStore);
	protected readonly broke = computed(() => this.auth.balance() < MIN_CHIP);
	protected readonly refillError = signal<string | null>(null);

	protected async refill(): Promise<void> {
		try {
			await this.auth.refill();
			this.refillError.set(null);
		} catch (error) {
			this.refillError.set(apiErrorMessage(error));
		}
	}

	protected async logout(): Promise<void> {
		await this.auth.logout();
		await this.router.navigateByUrl('/login');
	}
}
