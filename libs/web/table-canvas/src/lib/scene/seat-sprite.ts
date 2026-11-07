import type { SeatView } from '@blackjack/shared/protocol';
import { formatDollars } from '@blackjack/web/ui';
import { Container, Graphics, Text } from 'pixi.js';
import { chipStack } from './chips';
import { handLabel } from './hand-labels';
import { handOrigin, handScale, type Point, seatPosition } from './layout';
import { colors, textStyles } from './palette';
import { pill } from './pill';
import { ease, type Tweener } from './tween';

const SPOT_RADIUS = 58;

export interface SeatContext {
	/** Whether the person looking at the table already has a seat. */
	viewerSeated: boolean;
	isViewer: boolean;
	/** Index of the hand whose turn it is at this seat, if any. */
	activeHand: number | null;
	showReady: boolean;
}

/** A seat: betting spot, chips, player name and the labels above each hand. Cards live in the card layer. */
export class SeatSprite extends Container {
	private readonly spot = new Graphics();
	private readonly turnRing = new Graphics();
	private readonly bet = new Container();
	private readonly nameplate = new Container();
	private readonly labels = new Container();
	private readonly shownLabels = new Map<number, string>();

	constructor(
		private readonly index: number,
		private readonly tweener: Tweener,
		onPick: (index: number) => void,
	) {
		super();
		this.turnRing.circle(0, 0, SPOT_RADIUS + 12).stroke({ width: 8, color: colors.yellow });
		this.turnRing.visible = false;
		const seatSpot = new Container();
		seatSpot.position = seatPosition(index);
		seatSpot.addChild(this.turnRing, this.spot, this.bet, this.nameplate);
		this.nameplate.y = SPOT_RADIUS + 26;
		this.addChild(seatSpot, this.labels);
		this.spot.on('pointertap', () => onPick(this.index));
	}

	update(seat: SeatView, context: SeatContext): void {
		this.drawSpot(seat, context);
		this.drawBet(seat);
		this.drawNameplate(seat, context);
		// The viewer's own turn is shown on the action buttons instead.
		this.turnRing.visible = context.activeHand !== null && !context.isViewer;
	}

	/** Hand totals and results. The scene calls this once the cards they describe have landed. */
	updateLabels(seat: SeatView, activeHand: number | null): void {
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
			this.labels.addChild(badge);
			this.popIfNew(index, label.text, badge);
		});
	}

	/** Gentle glow on the seat whose turn it is. Called every frame. */
	pulse(time: number): void {
		if (this.turnRing.visible) {
			this.turnRing.alpha = 0.55 + 0.45 * Math.sin(time / 180);
			this.turnRing.scale.set(1 + 0.04 * Math.sin(time / 180));
		}
	}

	private drawSpot(seat: SeatView, context: SeatContext): void {
		const open = !seat.player;
		const pickable = open && !context.viewerSeated;
		this.spot
			.clear()
			.circle(0, 0, SPOT_RADIUS)
			.fill({ color: colors.feltDark, alpha: open ? 0.6 : 0.9 });
		this.spot.stroke({ width: 5, color: context.isViewer ? colors.yellow : colors.cream, alpha: 0.9 });
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

	private popIfNew(hand: number, text: string, badge: Container): void {
		if (this.shownLabels.get(hand) === text) {
			return;
		}
		this.shownLabels.set(hand, text);
		badge.scale.set(0.2);
		void this.tweener.to(badge.scale, { x: 1, y: 1 }, { duration: 320, ease: ease.outBack });
	}
}
