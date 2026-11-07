import type { Betting, BettingContext } from './betting';
import { clearSeat, type Seat, seatsOfUser } from './model';
import { who } from './table-log';

interface SeatedUser {
	id: number;
	username: string;
}

/** Sitting down, standing up and dropped connections. */
export class Seating {
	constructor(
		private readonly ctx: BettingContext,
		private readonly betting: Betting,
		private readonly onSeatsChanged: () => void,
	) {}

	sit(user: SeatedUser, index: number): string | null {
		const { state } = this.ctx;
		const seat = state.seats[index];
		if (!seat || seat.player) {
			return 'That seat is taken';
		}
		seat.player = { userId: user.id, username: user.username, connected: true };
		this.ctx.log.add(who(seat), ' sits down');
		this.changed();
		this.betting.evaluate();
		return null;
	}

	/** Players in a running round keep their hands until it ends; others leave at once with a refund. */
	async leave(seat: Seat): Promise<string | null> {
		if (!seat.player) {
			return null;
		}
		if (seat.hands.length > 0) {
			seat.leaving = true;
			this.ctx.broadcast();
			return null;
		}
		const { userId } = seat.player;
		const refund = seat.bet;
		this.ctx.log.add(who(seat), ' leaves the table');
		clearSeat(seat);
		await this.ctx.wallet.credit(userId, refund);
		this.changed();
		this.betting.evaluate();
		return null;
	}

	/** Applies to every seat the user holds. Seats out of the round are freed at once on disconnect. */
	async setConnected(userId: number, connected: boolean): Promise<void> {
		const seats = seatsOfUser(this.ctx.state, userId);
		for (const seat of seats) {
			if (seat.player) {
				seat.player.connected = connected;
			}
			if (!connected && seat.hands.length === 0) {
				await this.leave(seat);
			}
		}
		if (seats.length > 0) {
			this.ctx.broadcast();
		}
	}

	/** Drops players who left or disconnected during the round that just ended. */
	removeAbsentPlayers(): void {
		const absent = this.ctx.state.seats.filter(
			(seat) => seat.leaving || seat.player?.connected === false,
		);
		absent.forEach((seat) => {
			this.ctx.log.add(who(seat), ' leaves the table');
			clearSeat(seat);
		});
		if (absent.length > 0) {
			this.onSeatsChanged();
		}
	}

	private changed(): void {
		this.ctx.broadcast();
		this.onSeatsChanged();
	}
}
