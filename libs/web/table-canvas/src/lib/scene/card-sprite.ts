import type { CardView } from '@blackjack/shared/protocol';
import { Container } from 'pixi.js';
import { drawCardBack, drawCardFace } from './card-art';

/** One card on the table. Knows its back, and its face once the server reveals it. */
export class CardSprite extends Container {
	private readonly back = drawCardBack();
	private face: Container | null = null;
	/** Face state after any running flip finishes, so overlapping updates do not flip twice. */
	intendedFaceUp = false;

	constructor() {
		super();
		this.addChild(this.back);
	}

	/** Swaps the visible side. Called at the midpoint of a flip, when the card is edge-on. */
	showSide(card: CardView): void {
		const faceUp = card.faceUp && card.rank !== null && card.suit !== null;
		if (faceUp && !this.face && card.rank && card.suit) {
			this.face = drawCardFace(card.rank, card.suit);
			this.addChild(this.face);
		}
		this.back.visible = !faceUp;
		if (this.face) {
			this.face.visible = faceUp;
		}
	}
}
