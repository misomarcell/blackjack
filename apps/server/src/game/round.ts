import {
	dealerPeeks,
	dealerShouldHit,
	handTotal,
	insurancePayout,
	isNatural,
	offersInsurance,
	settleHand,
} from '@blackjack/shared/blackjack';
import type { PlayerAction } from '@blackjack/shared/protocol';
import type { GameConfig } from '../config';
import { type Countdown, Waiter } from './countdown';
import {
	type CardSource,
	type Hand,
	type PlayerStats,
	markNatural,
	needsDealer,
	playingSeats,
	type Seat,
	type TableState,
	type Wallet,
} from './model';
import { type ActionOutcome, playerActions } from './player-actions';
import { logAction, logDealerDone, logInsurance, logSettlement } from './round-log';
import { dealerName, type TableLog, total, value, who } from './table-log';

export interface RoundContext {
	readonly state: TableState;
	readonly shoe: CardSource;
	readonly wallet: Wallet;
	readonly stats: PlayerStats;
	readonly config: GameConfig;
	readonly countdown: Countdown;
	readonly log: TableLog;
	broadcast(): void;
}

/** Thrown out of a running round when its table is closed. */
export class RoundAborted extends Error {}

/**
 * One hand of blackjack from the deal to the payout. The flow reads top to bottom in `play`;
 * players drive it forward through `act` and `decideInsurance`, timers do so when they idle.
 */
export class Round {
	private readonly waiter = new Waiter();
	private aborted = false;
	private busy = false;

	constructor(private readonly ctx: RoundContext) {}

	async play(): Promise<void> {
		await this.dealOpeningCards();
		const dealerNatural = await this.checkDealer();
		if (!dealerNatural) {
			await this.playerTurns();
			await this.dealerTurn();
		}
		await this.settle(dealerNatural);
	}

	abort(): void {
		this.aborted = true;
		this.ctx.countdown.cancel();
		this.waiter.done();
	}

	/** Applies a player's move. Returns an error message for the player, or null. */
	async act(seat: Seat, action: PlayerAction): Promise<string | null> {
		const hand = this.handInTurn(seat);
		if (!hand || this.busy) {
			return 'It is not your turn';
		}
		this.busy = true;
		const before = [...hand.cards];
		const outcome = await this.runAction(seat, hand, action).finally(() => (this.busy = false));
		if (typeof outcome === 'object') {
			return outcome.error;
		}
		logAction(this.ctx.log, seat, hand, { action, before });
		// The turn timer may have fired during a wallet call; then the turn already belongs to someone else.
		const stillTheirTurn = this.handInTurn(seat) === hand;
		if (stillTheirTurn && outcome === 'done') {
			this.endTurn();
		} else if (stillTheirTurn) {
			this.startTurnTimer(seat, hand);
		}
		this.ctx.broadcast();
		return null;
	}

	async decideInsurance(seat: Seat, accept: boolean): Promise<string | null> {
		const hand = seat.hands[0];
		if (this.ctx.state.phase !== 'insurance' || !hand || seat.insurance !== null || !seat.player) {
			return 'Insurance is not available';
		}
		seat.insurance = 0;
		if (accept && (await this.ctx.wallet.debit(seat.player.userId, hand.bet / 2))) {
			await this.placeInsurance(seat, seat.player.userId, hand.bet / 2);
		}
		logInsurance(this.ctx.log, seat);
		this.ctx.broadcast();
		if (playingSeats(this.ctx.state).every((other) => other.insurance !== null)) {
			this.endTurn();
		}
		return null;
	}

	private runAction(seat: Seat, hand: Hand, action: PlayerAction): Promise<ActionOutcome> {
		const { shoe, wallet } = this.ctx;
		return Promise.resolve(playerActions[action]({ seat, hand, shoe, wallet }));
	}

	/** Insurance paid after the window closed (a slow wallet call) is handed straight back. */
	private async placeInsurance(seat: Seat, userId: number, amount: number): Promise<void> {
		if (this.ctx.state.phase !== 'insurance' || this.aborted) {
			return this.ctx.wallet.credit(userId, amount);
		}
		seat.insurance = amount;
	}

	private async dealOpeningCards(): Promise<void> {
		const { state, shoe } = this.ctx;
		state.phase = 'dealing';
		if (shoe.needsShuffle) {
			shoe.shuffle();
		}
		const seats = playingSeats(state);
		for (let pass = 0; pass < 2; pass++) {
			seats.forEach((seat) => seat.hands[0]?.cards.push(shoe.draw()));
			state.dealer.cards.push(shoe.draw());
		}
		state.dealer.holeHidden = true;
		seats.forEach((seat) => markNatural(seat.hands[0]));
		this.ctx.log.add('Round ', value(state.round), ' is dealt');
		this.ctx.broadcast();
		await this.pause((seats.length + 1) * 2 * this.ctx.config.dealMs);
	}

	/** Offers insurance under an ace, then peeks. Returns true when the dealer has blackjack. */
	private async checkDealer(): Promise<boolean> {
		const { dealer } = this.ctx.state;
		const upcard = dealer.cards[0];
		if (!upcard) {
			return false;
		}
		if (offersInsurance(upcard)) {
			await this.offerInsurance();
		}
		if (!dealerPeeks(upcard) || !isNatural(dealer.cards)) {
			return false;
		}
		dealer.holeHidden = false;
		this.ctx.log.add(dealerName, ' has ', value('blackjack'));
		return true;
	}

	private async offerInsurance(): Promise<void> {
		const { state, countdown, config } = this.ctx;
		state.phase = 'insurance';
		playingSeats(state).forEach((seat) => (seat.insurance = null));
		countdown.start(config.insuranceMs, () => this.waiter.done());
		this.ctx.broadcast();
		await this.wait();
		playingSeats(state).forEach((seat) => (seat.insurance ??= 0));
	}

	private async playerTurns(): Promise<void> {
		this.ctx.state.phase = 'playing';
		for (const seat of playingSeats(this.ctx.state)) {
			for (let index = 0; index < seat.hands.length; index++) {
				await this.playHand(seat, index);
			}
		}
		this.ctx.state.turn = null;
	}

	private async playHand(seat: Seat, index: number): Promise<void> {
		const hand = seat.hands[index] as Hand;
		const away = seat.leaving || !seat.player?.connected;
		if (hand.status === 'playing' && (away || handTotal(hand.cards).total === 21)) {
			hand.status = 'stood';
		}
		if (hand.status !== 'playing') {
			return;
		}
		this.ctx.state.turn = { seat: seat.index, hand: index };
		this.startTurnTimer(seat, hand);
		this.ctx.broadcast();
		await this.wait();
		await this.letLastCardLand();
	}

	/** The hand is over: clear the turn, and give its last card time to land before anyone else's. */
	private async letLastCardLand(): Promise<void> {
		this.ctx.state.turn = null;
		this.ctx.broadcast();
		await this.pause(2 * this.ctx.config.dealMs);
	}

	/** Turns the hole card over, then draws one card at a time so every client sees each hit. */
	private async dealerTurn(): Promise<void> {
		const { state, shoe, config, log } = this.ctx;
		const { cards } = state.dealer;
		state.phase = 'dealer';
		state.dealer.holeHidden = false;
		log.add(dealerName, ' turns over ', total(cards));
		await this.showDealerCard();
		if (!playingSeats(state).some((seat) => seat.hands.some(needsDealer))) {
			return;
		}
		while (dealerShouldHit(cards, config.hitSoft17)) {
			log.add(dealerName, ' hits on ', total(cards));
			cards.push(shoe.draw());
			await this.showDealerCard();
		}
		logDealerDone(log, cards);
	}

	private async showDealerCard(): Promise<void> {
		this.ctx.broadcast();
		await this.pause(2 * this.ctx.config.dealMs);
	}

	private async settle(dealerNatural: boolean): Promise<void> {
		const { state } = this.ctx;
		state.phase = 'settled';
		state.turn = null;
		state.dealer.holeHidden = false;
		for (const seat of playingSeats(state)) {
			await this.settleSeat(seat, dealerNatural);
		}
		this.ctx.broadcast();
		await this.pause(this.ctx.config.resultsMs);
	}

	private async settleSeat(seat: Seat, dealerNatural: boolean): Promise<void> {
		let payout = insurancePayout(seat.insurance ?? 0, dealerNatural);
		for (const hand of seat.hands) {
			const natural = hand.status === 'blackjack';
			const settlement = settleHand({ ...hand, natural }, this.ctx.state.dealer.cards, dealerNatural);
			hand.result = settlement.result;
			hand.payout = settlement.payout;
			payout += settlement.payout;
		}
		logSettlement(this.ctx.log, seat, this.ctx.state.dealer.cards, dealerNatural);
		if (seat.player) {
			await this.ctx.wallet.credit(seat.player.userId, payout);
			await this.ctx.stats.addHandsPlayed(seat.player.userId, seat.hands.length);
		}
	}

	private handInTurn(seat: Seat): Hand | undefined {
		const { phase, turn } = this.ctx.state;
		return phase === 'playing' && turn?.seat === seat.index ? seat.hands[turn.hand] : undefined;
	}

	private startTurnTimer(seat: Seat, hand: Hand): void {
		this.ctx.countdown.start(this.ctx.config.turnMs, () => {
			this.ctx.log.add(who(seat), ' ran out of time and stands on ', total(hand.cards));
			hand.status = 'stood';
			this.waiter.done();
		});
	}

	private endTurn(): void {
		this.ctx.countdown.cancel();
		this.waiter.done();
	}

	private async pause(ms: number): Promise<void> {
		await Bun.sleep(ms);
		this.throwIfAborted();
	}

	private async wait(): Promise<void> {
		await this.waiter.wait();
		this.throwIfAborted();
	}

	private throwIfAborted(): void {
		if (this.aborted) {
			throw new RoundAborted();
		}
	}
}
