import { withUserLock } from '../security/user-lock';
import type { Seat, Wallet } from './model';

/**
 * Gives a seat's money back under its owner's lock and takes it off the seat in the same step, so a message
 * from that player (leave-seat, clear-bet) or a refill can never see the same chips twice.
 */
export async function refundSeat(
	seat: Seat,
	wallet: Wallet,
	amountOf: (seat: Seat) => number,
): Promise<void> {
	const userId = seat.player?.userId;
	if (userId === undefined) {
		return;
	}
	await withUserLock(userId, async () => {
		if (seat.player?.userId !== userId) {
			return;
		}
		const amount = amountOf(seat);
		seat.bet = 0;
		await wallet.credit(userId, amount);
	});
}
