import { describe, expect, it } from 'bun:test';
import { withUserLock } from './user-lock';

describe('withUserLock', () => {
	it('runs one user’s tasks one after another', async () => {
		const order: string[] = [];
		const slow = withUserLock(1, async () => {
			await Bun.sleep(10);
			order.push('first');
		});
		const fast = withUserLock(1, () => order.push('second'));
		await Promise.all([slow, fast]);
		expect(order).toEqual(['first', 'second']);
	});

	it('keeps going after a task fails', async () => {
		await expect(withUserLock(1, () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
		expect(await withUserLock(1, () => 'still works')).toBe('still works');
	});
});
