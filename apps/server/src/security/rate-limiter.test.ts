import { describe, expect, it } from 'bun:test';
import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
	it('allows hits up to the limit, then blocks the key until the window ends', async () => {
		const limiter = new RateLimiter(2, 30);
		expect(limiter.hit('a')).toBe(true);
		expect(limiter.hit('a')).toBe(true);
		expect(limiter.blocked('a')).toBe(true);
		expect(limiter.hit('a')).toBe(false);
		expect(limiter.hit('b')).toBe(true);

		await Bun.sleep(35);
		expect(limiter.blocked('a')).toBe(false);
		expect(limiter.hit('a')).toBe(true);
	});
});
