import { Component, computed, type ElementRef, inject, signal, viewChild } from '@angular/core';
import type { PlayerSummary } from '@blackjack/shared/protocol';
import { apiErrorMessage, AuthStore, PlayersApi } from '@blackjack/web/data-access';
import { formatDollars, Icon } from '@blackjack/web/ui';

const joinedDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/** Admin list of registered players, with removal behind a confirmation dialog. */
@Component({
	selector: 'bj-admin-players-page',
	imports: [Icon],
	templateUrl: './admin-players-page.html',
	styleUrl: './admin-players-page.scss',
})
export class AdminPlayersPage {
	private readonly api = inject(PlayersApi);
	private readonly auth = inject(AuthStore);
	private readonly confirmDialog = viewChild.required<ElementRef<HTMLDialogElement>>('confirmRemove');

	protected readonly players = signal<PlayerSummary[] | null>(null);
	protected readonly pendingRemove = signal<PlayerSummary | null>(null);
	protected readonly error = signal<string | null>(null);
	protected readonly myId = computed(() => this.auth.user()?.id ?? null);
	protected readonly dollars = formatDollars;

	constructor() {
		void this.load();
	}

	protected joined(player: PlayerSummary): string {
		return joinedDate.format(new Date(player.createdAt));
	}

	protected askRemove(player: PlayerSummary): void {
		this.pendingRemove.set(player);
		this.confirmDialog().nativeElement.showModal();
	}

	/** Reads which button closed the dialog, then resets it so a later Esc is not read as a stale choice. */
	protected async onConfirmClosed(dialog: HTMLDialogElement): Promise<void> {
		const player = this.pendingRemove();
		const confirmed = dialog.returnValue === 'remove';
		dialog.returnValue = '';
		this.pendingRemove.set(null);
		if (confirmed && player) {
			await this.remove(player);
		}
	}

	private async remove(player: PlayerSummary): Promise<void> {
		try {
			await this.api.remove(player.id);
			this.players.update((players) => players?.filter((other) => other.id !== player.id) ?? null);
			this.error.set(null);
		} catch (error) {
			this.error.set(apiErrorMessage(error));
		}
	}

	private async load(): Promise<void> {
		try {
			this.players.set(await this.api.list());
		} catch (error) {
			this.error.set(apiErrorMessage(error));
		}
	}
}
