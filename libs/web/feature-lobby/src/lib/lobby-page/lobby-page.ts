import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LobbyFeed } from '@blackjack/web/data-access';
import { formatDollars } from '@blackjack/web/ui';

/** The table catalog. Player counts update live as people sit down and leave. */
@Component({
	selector: 'bj-lobby-page',
	imports: [RouterLink],
	providers: [LobbyFeed],
	templateUrl: './lobby-page.html',
	styleUrl: './lobby-page.scss',
})
export class LobbyPage {
	protected readonly feed = inject(LobbyFeed);
	protected readonly dollars = formatDollars;

	protected seatDots(seats: number): number[] {
		return Array.from({ length: seats }, (_, index) => index);
	}
}
