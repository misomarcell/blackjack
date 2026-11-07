import { SEAT_COUNT } from '@blackjack/shared/protocol';

/** Everything is laid out on a fixed logical stage and scaled to fit the canvas. */
export const STAGE = { width: 1600, height: 900 };
export const CARD = { width: 100, height: 140 };

export const SHOE = { x: 1420, y: 120 };
/** Cleared cards fly off the top-left edge of the table. */
export const DISCARD = { x: 60, y: -180 };
export const DEALER = { x: 800, y: 175 };

/** The player-side rail: its lowest point, thickness, and how far it rises at the visible edges. */
export const RAIL = { edge: 845, width: 46, rise: 80 };

/** Seats follow a shallow curve: lowest in the middle, rising towards both ends. */
const SEAT_ARC = { halfWidth: 640, bottom: 600, rise: 120 };

export interface Point {
	x: number;
	y: number;
}

/** Seats sit on a shallow arc, seat 0 on the left as players see it. */
export function seatPosition(index: number): Point {
	const t = (index / (SEAT_COUNT - 1)) * 2 - 1;
	return {
		x: STAGE.width / 2 + SEAT_ARC.halfWidth * t,
		y: SEAT_ARC.bottom - SEAT_ARC.rise * t * t,
	};
}

/** Where a hand's first card goes: towards the dealer from the seat, spread out for split hands. */
export function handOrigin(seat: number, hand: number, handCount: number): Point {
	const spot = seatPosition(seat);
	const towardsDealer = { x: (DEALER.x - spot.x) * 0.22, y: (DEALER.y - spot.y) * 0.3 };
	const spread = (hand - (handCount - 1) / 2) * (handCount > 2 ? 95 : 120);
	return { x: spot.x + towardsDealer.x + spread, y: spot.y + towardsDealer.y };
}

/** Split hands shrink a little so up to four fit in front of a seat. */
export function handScale(handCount: number): number {
	return [1, 1, 0.85][handCount] ?? 0.72;
}

/** Player cards fan up and to the right so every rank stays readable. */
export function playerCardPosition(origin: Point, index: number, scale: number): Point {
	return { x: origin.x + index * 26 * scale, y: origin.y - index * 30 * scale };
}

export function dealerCardPosition(index: number, count: number): Point {
	const spacing = 70;
	return { x: DEALER.x + (index - (count - 1) / 2) * spacing, y: DEALER.y };
}
