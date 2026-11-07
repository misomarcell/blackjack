import type { Rank, Suit } from '@blackjack/shared/blackjack';
import { Container, Graphics, Text } from 'pixi.js';
import { CARD } from './layout';
import { colors, textStyles } from './palette';

const RADIUS = 12;
const RED_SUITS: readonly Suit[] = ['hearts', 'diamonds'];

type SuitPainter = (g: Graphics, x: number, y: number, s: number) => void;

/** Suits are drawn as shapes so they look the same on every device, no emoji font needed. */
const suitPainters: Record<Suit, SuitPainter> = {
	diamonds: (g, x, y, s) => g.poly([x, y - s, x + 0.72 * s, y, x, y + s, x - 0.72 * s, y]),
	hearts: (g, x, y, s) =>
		g
			.circle(x - 0.48 * s, y - 0.3 * s, 0.52 * s)
			.circle(x + 0.48 * s, y - 0.3 * s, 0.52 * s)
			.poly([x - 0.98 * s, y - 0.12 * s, x + 0.98 * s, y - 0.12 * s, x, y + s]),
	spades: (g, x, y, s) =>
		g
			.circle(x - 0.48 * s, y + 0.18 * s, 0.5 * s)
			.circle(x + 0.48 * s, y + 0.18 * s, 0.5 * s)
			.poly([x - 0.96 * s, y + 0.02 * s, x + 0.96 * s, y + 0.02 * s, x, y - s])
			.poly([x, y + 0.2 * s, x - 0.38 * s, y + s, x + 0.38 * s, y + s]),
	clubs: (g, x, y, s) =>
		g
			.circle(x, y - 0.45 * s, 0.42 * s)
			.circle(x - 0.46 * s, y + 0.12 * s, 0.42 * s)
			.circle(x + 0.46 * s, y + 0.12 * s, 0.42 * s)
			.poly([x, y, x - 0.36 * s, y + s, x + 0.36 * s, y + s]),
};

export function suitColor(suit: Suit): number {
	return RED_SUITS.includes(suit) ? colors.red : colors.ink;
}

function drawSuit(suit: Suit, x: number, y: number, size: number): Graphics {
	const g = new Graphics();
	suitPainters[suit](g, x, y, size);
	return g.fill(suitColor(suit));
}

function cardBase(fill: number): Graphics {
	return new Graphics()
		.roundRect(-CARD.width / 2, -CARD.height / 2, CARD.width, CARD.height, RADIUS)
		.fill(fill)
		.stroke({ width: 4, color: colors.ink });
}

export function drawCardFace(rank: Rank, suit: Suit): Container {
	const face = new Container();
	const color = suitColor(suit);
	face.addChild(cardBase(colors.cream));

	const corner = new Text({ text: rank, style: { ...textStyles.rank, fill: color } });
	corner.position.set(-CARD.width / 2 + 9, -CARD.height / 2 + 4);
	face.addChild(corner, drawSuit(suit, -CARD.width / 2 + 22, -CARD.height / 2 + 50, 11));

	const isFace = rank === 'J' || rank === 'Q' || rank === 'K';
	if (isFace) {
		const frame = new Graphics()
			.roundRect(-30, -36, 60, 80, 8)
			.fill(colors.yellow)
			.stroke({ width: 3, color });
		const letter = new Text({ text: rank, style: { ...textStyles.rank, fontSize: 44, fill: color } });
		letter.anchor.set(0.5);
		letter.position.set(0, 4);
		face.addChild(frame, letter);
	} else {
		face.addChild(drawSuit(suit, 4, 12, 30));
	}
	return face;
}

export function drawCardBack(): Container {
	const back = new Container();
	back.addChild(cardBase(colors.rail));
	const inner = new Graphics()
		.roundRect(-CARD.width / 2 + 9, -CARD.height / 2 + 9, CARD.width - 18, CARD.height - 18, 8)
		.stroke({ width: 3, color: colors.white });
	const dots = new Graphics();
	for (let x = -30; x <= 30; x += 15) {
		for (let y = -50; y <= 50; y += 15) {
			dots.circle(x, y, 3.2);
		}
	}
	back.addChild(inner, dots.fill({ color: colors.white, alpha: 0.75 }));
	return back;
}
