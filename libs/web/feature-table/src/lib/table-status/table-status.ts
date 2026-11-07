import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Phase, TableView } from '@blackjack/shared/protocol';
import { TableAudio } from '@blackjack/web/table-canvas';
import { formatDollars } from '@blackjack/web/ui';

const PHASE_MESSAGES: Record<Phase, string> = {
	idle: 'Place a bet to start',
	betting: 'Place your bets!',
	dealing: 'Dealing…',
	insurance: 'Dealer shows an ace — insurance?',
	playing: '',
	dealer: 'Dealer plays',
	settled: 'Round over',
};

/** Top bar of the table screen: name and limits, what is happening, and the sound/share/seat buttons. */
@Component({
	selector: 'bj-table-status',
	imports: [RouterLink],
	templateUrl: './table-status.html',
	styleUrl: './table-status.scss',
})
export class TableStatus {
	readonly table = input.required<TableView>();
	readonly viewerId = input<number | null>(null);
	readonly leaveSeat = output();

	protected readonly audio = inject(TableAudio);
	protected readonly copied = signal(false);
	protected readonly limits = computed(
		() => `${formatDollars(this.table().minBet)} – ${formatDollars(this.table().maxBet)}`,
	);
	protected readonly seated = computed(() =>
		this.table().seats.some((seat) => seat.player?.userId === this.viewerId()),
	);

	protected readonly message = computed(() => {
		const table = this.table();
		if (table.phase === 'playing') {
			return this.turnMessage(table);
		}
		return table.phase === 'idle' && !this.seated()
			? 'Pick an open seat to play'
			: PHASE_MESSAGES[table.phase];
	});

	protected async share(): Promise<void> {
		await navigator.clipboard.writeText(location.href);
		this.copied.set(true);
		setTimeout(() => this.copied.set(false), 2000);
	}

	private turnMessage(table: TableView): string {
		const player = table.turn ? table.seats[table.turn.seat]?.player : null;
		if (!player) {
			return 'Players act';
		}
		return player.userId === this.viewerId() ? 'Your turn!' : `${player.username}'s turn`;
	}
}
