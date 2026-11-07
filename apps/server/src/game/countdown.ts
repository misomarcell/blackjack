import type { TimerView } from '@blackjack/shared/protocol';

/** One visible countdown per table (betting, insurance or the current turn). */
export class Countdown {
	private handle: ReturnType<typeof setTimeout> | null = null;
	private endsAt = 0;
	private totalMs = 0;

	start(ms: number, onDone: () => void): void {
		this.cancel();
		this.totalMs = ms;
		this.endsAt = Date.now() + ms;
		this.handle = setTimeout(() => {
			this.handle = null;
			onDone();
		}, ms);
	}

	cancel(): void {
		if (this.handle) {
			clearTimeout(this.handle);
		}
		this.handle = null;
	}

	get running(): boolean {
		return this.handle !== null;
	}

	view(): TimerView | null {
		if (!this.handle) {
			return null;
		}
		return { remainingMs: Math.max(0, this.endsAt - Date.now()), totalMs: this.totalMs };
	}
}

/** A promise the round awaits until a player (or a timeout) releases it. */
export class Waiter {
	private release: (() => void) | null = null;

	wait(): Promise<void> {
		return new Promise((resolve) => {
			this.release = resolve;
		});
	}

	done(): void {
		const release = this.release;
		this.release = null;
		release?.();
	}
}
