import type { Ticker } from 'pixi.js';

type Ease = (t: number) => number;

export const ease = {
	outCubic: (t: number) => 1 - (1 - t) ** 3,
	inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
	outBack: (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
};

export interface TweenOptions {
	duration: number;
	delay?: number;
	ease?: Ease;
}

/** Only the numeric properties of a target can be tweened. */
type NumericProps<T> = { [Key in keyof T as T[Key] extends number ? Key : never]?: number };

interface Tween {
	target: object;
	from: Record<string, number>;
	to: Record<string, number>;
	start: number;
	options: Required<TweenOptions>;
	resolve: () => void;
}

/** A tiny tween engine on top of the Pixi ticker, enough for sliding, flipping and popping. */
export class Tweener {
	private tweens: Tween[] = [];

	constructor(private readonly ticker: Ticker) {
		ticker.add(this.update, this);
	}

	to<T extends object>(target: T, props: NumericProps<T>, options: TweenOptions): Promise<void> {
		this.cancel(target);
		const values = target as Record<string, number>;
		const to = props as Record<string, number>;
		const from = Object.fromEntries(Object.keys(to).map((key) => [key, values[key] ?? 0]));
		return new Promise((resolve) => {
			this.tweens.push({
				target,
				from,
				to,
				start: performance.now() + (options.delay ?? 0),
				options: { delay: 0, ease: ease.outCubic, ...options },
				resolve,
			});
		});
	}

	/** Stops tweens on a target where they are. Their promises resolve so chains do not hang. */
	cancel(target: object): void {
		const [cancelled, kept] = partition(this.tweens, (tween) => tween.target === target);
		this.tweens = kept;
		cancelled.forEach((tween) => tween.resolve());
	}

	destroy(): void {
		this.ticker.remove(this.update, this);
		this.tweens = [];
	}

	private update(): void {
		const now = performance.now();
		const finished = this.tweens.filter((tween) => this.step(tween, now));
		this.tweens = this.tweens.filter((tween) => !finished.includes(tween));
		finished.forEach((tween) => tween.resolve());
	}

	/** Applies one frame and returns true when the tween is complete. */
	private step(tween: Tween, now: number): boolean {
		if (now < tween.start) {
			return false;
		}
		const progress = Math.min(1, (now - tween.start) / tween.options.duration);
		const eased = tween.options.ease(progress);
		const values = tween.target as Record<string, number>;
		for (const [key, end] of Object.entries(tween.to)) {
			const begin = tween.from[key] ?? end;
			values[key] = begin + (end - begin) * eased;
		}
		return progress >= 1;
	}
}

function partition<T>(items: T[], predicate: (item: T) => boolean): [T[], T[]] {
	return [items.filter(predicate), items.filter((item) => !predicate(item))];
}
