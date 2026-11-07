import type { SeatView } from '@blackjack/shared/protocol';
import { formatDollars } from '@blackjack/web/ui';
import { Container, Graphics, Text } from 'pixi.js';
import { chipStack } from './chips';
import { handLabel } from './hand-labels';
import { HandPointer } from './hand-pointer';
import { handOrigin, handScale, type Point, seatPosition } from './layout';
import { colors, textStyles } from './palette';
import { pill } from './pill';
import type { SceneSounds } from './sounds';
import { ease, type Tweener } from './tween';

const SPOT_RADIUS = 58;

/** An open seat is a betting spot printed on the felt; a taken one is a solid ringed spot. */
function paintSpot(spot: Graphics, open: boolean, pickable: boolean, isViewer: boolean): void {
	spot.clear().circle(0, 0, SPOT_RADIUS);
	if (open) {
		spot.fill({ color: colors.feltDark, alpha: pickable ? 0.45 : 0.25 }).stroke({
			width: 5,
			color: colors.feltPrint,
			alpha: pickable ? 0.9 : 0.45,
		});
		return;
	}
	spot.fill({ color: colors.feltDark, alpha: 0.9 }).stroke({
		width: 5,
		color: isViewer ? colors.yellow : colors.cream,
		alpha: 0.9,
	});
}

export interface SeatContext {
	/** Whether the person looking at the table already has a seat. */
	viewerSeated: boolean;
	isViewer: boolean;
	/** Index of the hand whose turn it is at this seat, if any. */
	activeHand: number | null;
	showReady: boolean;
}

/**
 * A seat: betting spot, chips and player name. The hand labels and split pointer live in `overlay`,
 * which the scene draws above the card layer so cards never hide a total.
 */
export class SeatSprite extends Container {
	readonly overlay = new Container();
	private readonly seatSpot = new Container();
	private readonly spot = new Graphics();
	private readonly turnRing = new Graphics();
	private readonly bet = new Container();
	private readonly nameplate = new Container();
	private readonly labels = new Container();
	private readonly shownLabels = new Map<number, string>();
	private readonly pointer = new HandPointer();
	/** Seats, names and labels grow on small screens so they stay readable. */
	private uiScale = 1;
	/** -1 until the first snapshot, so joining a table plays no chip sounds. */
	private shownBet = -1;
	private shownTurn: number | null = null;

	constructor(
		private readonly index: number,
		private readonly tweener: Tweener,
		private readonly sounds: SceneSounds,
		onPick: (index: number) => void,
	) {
		super();
		this.turnRing.circle(0, 0, SPOT_RADIUS + 12).stroke({ width: 8, color: colors.yellow });
		this.turnRing.visible = false;
		this.seatSpot.position = seatPosition(index);
		this.seatSpot.addChild(this.turnRing, this.spot, this.bet, this.nameplate);
		this.nameplate.y = SPOT_RADIUS + 26;
		this.addChild(this.seatSpot);
		this.overlay.addChild(this.labels, this.pointer);
		this.spot.on('pointertap', () => onPick(this.index));
	}

	setUiScale(scale: number): void {
		this.uiScale = scale;
		this.seatSpot.scale.set(scale);
		this.pointer.scale.set(scale);
		this.labels.children.forEach((badge) => badge.scale.set(scale));
	}

	update(seat: SeatView, context: SeatContext): void {
		this.drawSpot(seat, context);
		this.drawBet(seat);
		this.drawNameplate(seat, context);
		// Others see a steady ring on whoever is playing; the viewer's own turn lights up the action buttons.
		this.turnRing.visible = context.activeHand !== null && !context.isViewer;
		this.announceTurn(context);
	}

	/** Hand totals, results and the split-hand pointer, once the cards they describe have landed. */
	updateLabels(seat: SeatView, activeHand: number | null, isViewer: boolean): void {
		this.labels.children.forEach((child) => this.tweener.cancel(child.scale));
		this.labels.removeChildren().forEach((child) => child.destroy({ children: true }));
		if (seat.hands.length === 0) {
			this.shownLabels.clear();
		}
		seat.hands.forEach((hand, index) => {
			if (hand.cards.length === 0) {
				return;
			}
			const label = handLabel(hand, activeHand === index);
			const badge = pill(label.text, label.fill, label.textColor);
			badge.position = this.labelPosition(index, seat.hands.length, hand.cards.length);
			badge.scale.set(this.uiScale);
			this.labels.addChild(badge);
			if (this.popIfNew(index, label.text, badge) && isViewer && hand.result) {
				this.sounds.result(hand.result);
			}
		});
		this.placePointer(seat, activeHand, isViewer);
	}

	/** Called every frame. */
	pulse(time: number): void {
		this.pointer.bob(time);
	}

	/** Only split seats need to show which hand is up. */
	private placePointer(seat: SeatView, activeHand: number | null, isViewer: boolean): void {
		const hand = activeHand === null ? undefined : seat.hands[activeHand];
		if (activeHand === null || !hand || seat.hands.length < 2) {
			this.pointer.hide();
			return;
		}
		const label = this.labelPosition(activeHand, seat.hands.length, hand.cards.length);
		this.pointer.show({ x: label.x, y: label.y - 24 * this.uiScale }, isViewer);
	}

	private announceTurn(context: SeatContext): void {
		const turn = context.isViewer ? context.activeHand : null;
		if (turn !== null && turn !== this.shownTurn) {
			this.sounds.yourTurn();
		}
		this.shownTurn = turn;
	}

	private drawSpot(seat: SeatView, context: SeatContext): void {
		const open = !seat.player;
		const pickable = open && !context.viewerSeated;
		paintSpot(this.spot, open, pickable, context.isViewer);
		this.spot.eventMode = pickable ? 'static' : 'none';
		this.spot.cursor = pickable ? 'pointer' : 'default';
		this.spot.removeChildren().forEach((child) => child.destroy());
		if (open) {
			const label = new Text({ text: pickable ? 'SIT' : 'OPEN', style: textStyles.label });
			label.anchor.set(0.5);
			this.spot.addChild(label);
		}
	}

	private drawBet(seat: SeatView): void {
		this.bet.removeChildren().forEach((child) => child.destroy({ children: true }));
		const amount = seat.bet + seat.hands.reduce((sum, hand) => sum + hand.bet, 0);
		if (this.shownBet >= 0 && amount > this.shownBet) {
			this.sounds.chip();
		}
		this.shownBet = amount;
		if (amount <= 0) {
			return;
		}
		const stack = chipStack(amount);
		stack.y = 6;
		const label = pill(formatDollars(amount), colors.ink);
		label.position.set(0, 44);
		label.scale.set(0.8);
		this.bet.addChild(stack, label);
	}

	private drawNameplate(seat: SeatView, context: SeatContext): void {
		this.nameplate.removeChildren().forEach((child) => child.destroy({ children: true }));
		if (!seat.player) {
			return;
		}
		const tags = [
			context.isViewer ? 'YOU' : null,
			context.showReady ? 'READY' : null,
			seat.insurance ? 'INSURED' : null,
		];
		const suffix = tags.filter(Boolean).join(' · ');
		const name = pill(suffix ? `${seat.player.username} · ${suffix}` : seat.player.username, colors.rail);
		name.alpha = seat.player.connected ? 1 : 0.45;
		this.nameplate.addChild(name);
	}

	private labelPosition(hand: number, handCount: number, cardCount: number): Point {
		const origin = handOrigin(this.index, hand, handCount);
		const scale = handScale(handCount);
		return {
			x: origin.x + (cardCount - 1) * 13 * scale,
			y: origin.y - (100 + (cardCount - 1) * 30) * scale,
		};
	}

	/** Pops a label that changed. Returns whether it was new. */
	private popIfNew(hand: number, text: string, badge: Container): boolean {
		if (this.shownLabels.get(hand) === text) {
			return false;
		}
		this.shownLabels.set(hand, text);
		const size = this.uiScale;
		badge.scale.set(0.2 * size);
		void this.tweener.to(badge.scale, { x: size, y: size }, { duration: 320, ease: ease.outBack });
		return true;
	}
}
