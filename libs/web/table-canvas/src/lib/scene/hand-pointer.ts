import { Graphics } from 'pixi.js';
import type { Point } from './layout';
import { colors } from './palette';

const BOB_PX = 7;

/** An arrow above the hand being played, so split hands show which one is up. */
export class HandPointer extends Graphics {
	private baseY = 0;
	private animated = false;

	constructor() {
		super();
		this.poly([-22, -30, 22, -30, 0, 0]).fill(colors.yellow).stroke({ width: 5, color: colors.ink });
		this.visible = false;
	}

	/** Points down at `at`. Only the viewer's own pointer bounces. */
	show(at: Point, animated: boolean): void {
		this.position.set(at.x, at.y);
		this.baseY = at.y;
		this.animated = animated;
		this.visible = true;
	}

	hide(): void {
		this.visible = false;
	}

	/** Called every frame. */
	bob(time: number): void {
		if (this.visible && this.animated) {
			this.y = this.baseY - BOB_PX * (0.5 + 0.5 * Math.sin(time / 160));
		}
	}
}
