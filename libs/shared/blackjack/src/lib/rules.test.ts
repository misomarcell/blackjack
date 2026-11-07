import { describe, expect, it } from 'bun:test';
import type { Rank } from './card';
import { canDouble, canSplit, dealerPeeks, dealerShouldHit, offersInsurance } from './rules';

const hand = (...ranks: Rank[]) => ranks.map((rank) => ({ rank }));

describe('canSplit', () => {
	it('allows pairs of equal value', () => {
		expect(canSplit(hand('8', '8'), 1)).toBe(true);
		expect(canSplit(hand('K', '10'), 1)).toBe(true);
	});

	it('rejects mixed values, three cards and the fifth hand', () => {
		expect(canSplit(hand('8', '9'), 1)).toBe(false);
		expect(canSplit(hand('8', '8', '2'), 1)).toBe(false);
		expect(canSplit(hand('8', '8'), 4)).toBe(false);
	});
});

describe('canDouble', () => {
	it('only allows doubling on two cards', () => {
		expect(canDouble(hand('5', '6'))).toBe(true);
		expect(canDouble(hand('2', '3', '6'))).toBe(false);
	});
});

describe('dealerShouldHit', () => {
	it('hits below 17 and stands on hard 17', () => {
		expect(dealerShouldHit(hand('10', '6'), false)).toBe(true);
		expect(dealerShouldHit(hand('10', '7'), true)).toBe(false);
	});

	it('follows the soft 17 rule', () => {
		expect(dealerShouldHit(hand('A', '6'), false)).toBe(false);
		expect(dealerShouldHit(hand('A', '6'), true)).toBe(true);
	});
});

describe('insurance and peeking', () => {
	it('offers insurance only against an ace', () => {
		expect(offersInsurance({ rank: 'A' })).toBe(true);
		expect(offersInsurance({ rank: 'K' })).toBe(false);
	});

	it('peeks under aces and ten-value cards', () => {
		expect(dealerPeeks({ rank: 'A' })).toBe(true);
		expect(dealerPeeks({ rank: 'Q' })).toBe(true);
		expect(dealerPeeks({ rank: '9' })).toBe(false);
	});
});
