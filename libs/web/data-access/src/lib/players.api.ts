import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { LeaderboardEntry, PlayerSummary } from '@blackjack/shared/protocol';
import { firstValueFrom } from 'rxjs';

/** The lobby leaderboard, and the player list admins manage. */
@Service()
export class PlayersApi {
	private readonly http = inject(HttpClient);

	leaderboard(): Promise<LeaderboardEntry[]> {
		return firstValueFrom(this.http.get<LeaderboardEntry[]>('/api/players/leaderboard'));
	}

	list(): Promise<PlayerSummary[]> {
		return firstValueFrom(this.http.get<PlayerSummary[]>('/api/players'));
	}

	async remove(id: number): Promise<void> {
		await firstValueFrom(this.http.delete(`/api/players/${id}`));
	}
}
