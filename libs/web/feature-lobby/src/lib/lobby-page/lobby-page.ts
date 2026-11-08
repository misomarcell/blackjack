import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LobbyFeed } from '@blackjack/web/data-access';
import { formatDollars } from '@blackjack/web/ui';
import { Leaderboard } from '../leaderboard/leaderboard';

/** How far the middle seats sit below the end seats in a table card. */
const SEAT_CURVE_REM = 0.9;

/** The table catalog (player counts update live as people sit down and leave), then the leaderboard. */
@Component({
	selector: 'bj-lobby-page',
	imports: [RouterLink, Leaderboard],
	providers: [LobbyFeed],
	templateUrl: './lobby-page.html',
	styleUrl: './lobby-page.scss',
})
export class LobbyPage {
	protected readonly feed = inject(LobbyFeed);
	protected readonly dollars = formatDollars;

	/** Seats on the same shallow curve as the real table: lowest in the middle, rising to both ends. */
	protected seatDots(seats: number): { index: number; drop: number }[] {
		return Array.from({ length: seats }, (_, index) => {
			const t = seats > 1 ? (index / (seats - 1)) * 2 - 1 : 0;
			return { index, drop: SEAT_CURVE_REM * (1 - t * t) };
		});
	}
}
