import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import type { LeaderboardEntry } from '@blackjack/shared/protocol';
import { AuthStore, PlayersApi } from '@blackjack/web/data-access';
import { formatDollars } from '@blackjack/web/ui';

/** Balances move with every round, so the board refreshes on its own while the lobby is open. */
const REFRESH_MS = 30_000;

/** The richest players, most money on top, with the viewer's own row highlighted. */
@Component({
	selector: 'bj-leaderboard',
	templateUrl: './leaderboard.html',
	styleUrl: './leaderboard.scss',
})
export class Leaderboard {
	private readonly api = inject(PlayersApi);
	private readonly auth = inject(AuthStore);

	protected readonly entries = signal<LeaderboardEntry[] | null>(null);
	protected readonly failed = signal(false);
	protected readonly me = computed(() => this.auth.user()?.username ?? null);
	protected readonly dollars = formatDollars;

	constructor() {
		void this.load();
		const timer = setInterval(() => void this.load(), REFRESH_MS);
		inject(DestroyRef).onDestroy(() => clearInterval(timer));
	}

	private async load(): Promise<void> {
		try {
			this.entries.set(await this.api.leaderboard());
			this.failed.set(false);
		} catch {
			this.failed.set(true);
		}
	}
}
