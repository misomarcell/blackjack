import type { CardView } from '@blackjack/shared/protocol';
import { Container } from 'pixi.js';
import { CardSprite } from './card-sprite';
import type { SceneSounds } from './sounds';
import { DISCARD, SHOE } from './layout';
import { ease, type Tweener } from './tween';

export interface CardTarget {
	card: CardView;
	x: number;
	y: number;
	scale: number;
}

const STAGGER_MS = 280;
const SLIDE_MS = 360;
const FLIP_MS = 260;
const MOVE_MS = 260;
const DISCARD_MS = 420;

interface Placement {
	x: number;
	y: number;
	scale: number;
}

/**
 * Keeps card sprites in sync with the snapshot. New cards slide out of the shoe one after another
 * (in deal order) and flip at the end, revealed cards flip in place, and cleared cards fly to the discard.
 */
export class CardLayer extends Container {
	private readonly sprites = new Map<string, CardSprite>();
	private readonly placements = new WeakMap<CardSprite, Placement>();
	/** When the last running deal, flip or move finishes (performance.now() time). */
	private settledAt = 0;

	constructor(
		private readonly tweener: Tweener,
		private readonly sounds: SceneSounds,
	) {
		super();
		this.sortableChildren = true;
	}

	/** How long until every card on the table has landed and shows its final side. */
	get remainingMs(): number {
		return Math.max(0, this.settledAt - performance.now());
	}

	sync(targets: CardTarget[]): void {
		this.discardMissing(new Set(targets.map((target) => target.card.id)));
		const fresh = targets
			.filter((target) => !this.sprites.has(target.card.id))
			.sort((a, b) => a.card.seq - b.card.seq);
		let slot = 0;
		for (const target of targets) {
			slot = this.update(target, slot);
		}
		fresh.forEach((target) => void this.deal(target, slot++ * STAGGER_MS));
	}

	/** Moves or flips a card already on the table. Returns the next free animation slot. */
	private update(target: CardTarget, slot: number): number {
		const sprite = this.sprites.get(target.card.id);
		if (!sprite) {
			return slot;
		}
		const placement = this.placements.get(sprite);
		if (
			placement &&
			(placement.x !== target.x || placement.y !== target.y || placement.scale !== target.scale)
		) {
			this.place(sprite, target, { duration: MOVE_MS });
		}
		if (target.card.faceUp !== sprite.intendedFaceUp) {
			setTimeout(() => this.sounds.card(), slot * STAGGER_MS);
			void this.flip(sprite, target, slot * STAGGER_MS);
			return slot + 1;
		}
		return slot;
	}

	private async deal(target: CardTarget, delay: number): Promise<void> {
		const sprite = new CardSprite();
		sprite.position.set(SHOE.x, SHOE.y);
		sprite.rotation = -0.5;
		sprite.scale.set(target.scale * 0.8);
		sprite.zIndex = target.card.seq;
		sprite.intendedFaceUp = target.card.faceUp;
		this.sprites.set(target.card.id, sprite);
		this.addChild(sprite);
		setTimeout(() => this.sounds.card(), delay);
		await this.place(sprite, target, { duration: SLIDE_MS, delay });
		if (target.card.faceUp) {
			await this.flip(sprite, target, 0);
		}
	}

	private place(
		sprite: CardSprite,
		target: CardTarget,
		timing: { duration: number; delay?: number },
	): Promise<void> {
		this.placements.set(sprite, { x: target.x, y: target.y, scale: target.scale });
		this.busyFor(timing.duration + (timing.delay ?? 0) + (target.card.faceUp ? FLIP_MS : 0));
		void this.tweener.to(sprite.scale, { x: target.scale, y: target.scale }, timing);
		return this.tweener.to(sprite, { x: target.x, y: target.y, rotation: 0 }, timing);
	}

	/** Squashes the card edge-on, swaps the side, and opens it up again. */
	private async flip(sprite: CardSprite, target: CardTarget, delay: number): Promise<void> {
		// The card may have been cleared (or the scene torn down) while it was still flying in.
		if (sprite.destroyed) {
			return;
		}
		sprite.intendedFaceUp = target.card.faceUp;
		this.busyFor(delay + FLIP_MS);
		const half = { duration: FLIP_MS / 2, ease: ease.inOutQuad };
		await this.tweener.to(sprite.scale, { x: 0 }, { ...half, delay });
		if (sprite.destroyed) {
			return;
		}
		sprite.showSide(target.card);
		await this.tweener.to(sprite.scale, { x: target.scale }, half);
	}

	private busyFor(ms: number): void {
		this.settledAt = Math.max(this.settledAt, performance.now() + ms);
	}

	private discardMissing(keep: Set<string>): void {
		let index = 0;
		for (const [id, sprite] of this.sprites) {
			if (keep.has(id)) {
				continue;
			}
			this.sprites.delete(id);
			const timing = { duration: DISCARD_MS, delay: index++ * 40, ease: ease.inOutQuad };
			void this.tweener
				.to(sprite, { x: DISCARD.x, y: DISCARD.y, rotation: 0.6, alpha: 0 }, timing)
				.then(() => sprite.destroy({ children: true }));
		}
	}
}
