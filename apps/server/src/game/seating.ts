import type { Betting, BettingContext } from './betting';
import { clearSeat, type Seat, seatOfUser } from './model';
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
		if (seatOfUser(state, user.id)) {
			return 'You already have a seat here';
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

	async setConnected(userId: number, connected: boolean): Promise<void> {
		const seat = seatOfUser(this.ctx.state, userId);
		if (!seat?.player) {
			return;
		}
		seat.player.connected = connected;
		if (!connected && seat.hands.length === 0) {
			await this.leave(seat);
			return;
		}
		this.ctx.broadcast();
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
