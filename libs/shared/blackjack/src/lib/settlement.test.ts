import { describe, expect, it } from 'bun:test';
import type { Rank } from './card';
import { insurancePayout, settleHand } from './settlement';

const cards = (...ranks: Rank[]) => ranks.map((rank) => ({ rank }));
const player = (bet: number, ...ranks: Rank[]) => ({ cards: cards(...ranks), bet, natural: false });

describe('settleHand', () => {
	it('pays 3:2 for a natural', () => {
		const natural = { cards: cards('A', 'K'), bet: 10, natural: true };
		expect(settleHand(natural, cards('10', '9'), false)).toEqual({ result: 'blackjack', payout: 25 });
	});

	it('pushes a natural against a dealer natural', () => {
		const natural = { cards: cards('A', 'K'), bet: 10, natural: true };
		expect(settleHand(natural, cards('A', 'Q'), true)).toEqual({ result: 'push', payout: 10 });
	});

	it('loses everything else to a dealer natural', () => {
		expect(settleHand(player(10, '10', 'Q'), cards('A', 'Q'), true).result).toBe('lose');
	});

	it('pays even money on a win and when the dealer busts', () => {
		expect(settleHand(player(10, '10', '9'), cards('10', '8'), false)).toEqual({
			result: 'win',
			payout: 20,
		});
		expect(settleHand(player(10, '10', '2'), cards('10', '6', '9'), false).result).toBe('win');
	});

	it('returns the stake on a push and nothing on a loss or bust', () => {
		expect(settleHand(player(10, '10', '8'), cards('10', '8'), false).payout).toBe(10);
		expect(settleHand(player(10, '10', '7'), cards('10', '8'), false).payout).toBe(0);
		expect(settleHand(player(10, '10', '7', '5'), cards('10', '6', '9'), false).result).toBe('bust');
	});

	it('does not pay 3:2 for 21 made from a split hand', () => {
		expect(settleHand(player(10, 'A', 'K'), cards('10', '9'), false)).toEqual({
			result: 'win',
			payout: 20,
		});
	});
});

describe('insurancePayout', () => {
	it('pays 2:1 when the dealer has blackjack', () => {
		expect(insurancePayout(5, true)).toBe(15);
		expect(insurancePayout(5, false)).toBe(0);
	});
});
