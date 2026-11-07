import { describe, expect, it } from 'bun:test';
import type { Rank } from './card';
import { handTotal, isBust, isNatural } from './hand';

const hand = (...ranks: Rank[]) => ranks.map((rank) => ({ rank }));

describe('handTotal', () => {
	it('adds number and face cards', () => {
		expect(handTotal(hand('7', 'K'))).toEqual({ total: 17, soft: false });
	});

	it('counts an ace as 11 when it fits', () => {
		expect(handTotal(hand('A', '6'))).toEqual({ total: 17, soft: true });
	});

	it('softens aces to avoid busting', () => {
		expect(handTotal(hand('A', '6', '9'))).toEqual({ total: 16, soft: false });
		expect(handTotal(hand('A', 'A', '9'))).toEqual({ total: 21, soft: true });
	});
});

describe('isBust / isNatural', () => {
	it('detects a bust', () => {
		expect(isBust(hand('K', 'Q', '2'))).toBe(true);
		expect(isBust(hand('K', 'A'))).toBe(false);
	});

	it('only treats two-card 21 as a natural', () => {
		expect(isNatural(hand('A', 'J'))).toBe(true);
		expect(isNatural(hand('7', '7', '7'))).toBe(false);
	});
});
