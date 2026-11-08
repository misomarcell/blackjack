import { describe, expect, it } from 'bun:test';
import { InFlight } from './in-flight';

describe('InFlight', () => {
	it('counts a wallet call until the caller has moved the money', async () => {
		const inFlight = new InFlight();
		let release: () => void = () => undefined;
		const call = inFlight.track(1, () => new Promise<void>((resolve) => (release = resolve)));
		expect(inFlight.has(1)).toBe(true);
		expect(inFlight.has(2)).toBe(false);

		release();
		await call;
		// Still counted while the caller's own continuation runs.
		expect(inFlight.has(1)).toBe(true);
		await Bun.sleep(1);
		expect(inFlight.has(1)).toBe(false);
	});

	it('keeps counting while any of several calls is running', async () => {
		const inFlight = new InFlight();
		const quick = inFlight.track(1, async () => 'quick');
		const slow = inFlight.track(1, () => Bun.sleep(20));
		await quick;
		await Bun.sleep(1);
		expect(inFlight.has(1)).toBe(true);
		await slow;
		await Bun.sleep(1);
		expect(inFlight.has(1)).toBe(false);
	});

	it('releases even when the call fails', async () => {
		const inFlight = new InFlight();
		await expect(inFlight.track(1, () => Promise.reject(new Error('db down')))).rejects.toThrow(
			'db down',
		);
		await Bun.sleep(1);
		expect(inFlight.has(1)).toBe(false);
	});
});
