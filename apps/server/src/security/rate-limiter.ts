interface Window {
	startedAt: number;
	count: number;
}

/** Allows at most `limit` hits per key in each `windowMs` (a fixed window, kept in memory). */
export class RateLimiter {
	private readonly windows = new Map<string, Window>();

	constructor(
		private readonly limit: number,
		private readonly windowMs: number,
	) {}

	/** Counts one hit. Returns false when the key is over its limit. */
	hit(key: string): boolean {
		const now = Date.now();
		this.forgetExpired(now);
		const window = this.windows.get(key);
		if (!window || now - window.startedAt >= this.windowMs) {
			this.windows.set(key, { startedAt: now, count: 1 });
			return true;
		}
		window.count++;
		return window.count <= this.limit;
	}

	/** True when the key may not hit again yet, without counting a hit. */
	blocked(key: string): boolean {
		const window = this.windows.get(key);
		return (
			window !== undefined &&
			Date.now() - window.startedAt < this.windowMs &&
			window.count >= this.limit
		);
	}

	/** Keeps the map small: windows that ended can go. */
	private forgetExpired(now: number): void {
		if (this.windows.size < 1000) {
			return;
		}
		this.windows.forEach((window, key) => {
			if (now - window.startedAt >= this.windowMs) {
				this.windows.delete(key);
			}
		});
	}
}
