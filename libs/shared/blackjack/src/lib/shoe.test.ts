import { describe, expect, it } from 'bun:test';
import { Shoe } from './shoe';

describe('Shoe', () => {
	it('deals unique, increasing ids', () => {
		const shoe = new Shoe(1);
		const first = shoe.draw();
		const second = shoe.draw();
		expect(first.id).not.toBe(second.id);
		expect(second.seq).toBe(first.seq + 1);
	});

	it('flags the cut card after three quarters of the shoe', () => {
		const shoe = new Shoe(1);
		Array.from({ length: 39 }).forEach(() => shoe.draw());
		expect(shoe.needsShuffle).toBe(false);
		shoe.draw();
		expect(shoe.needsShuffle).toBe(true);
	});

	it('keeps dealing after the shoe runs out', () => {
		const shoe = new Shoe(1);
		const drawn = Array.from({ length: 60 }, () => shoe.draw());
		expect(drawn).toHaveLength(60);
	});
});
