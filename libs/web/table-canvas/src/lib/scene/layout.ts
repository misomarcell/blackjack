import { SEAT_COUNT } from '@blackjack/shared/protocol';

/** Everything is laid out on a fixed logical stage and scaled to fit the canvas. */
export const STAGE = { width: 1600, height: 900 };
export const CARD = { width: 100, height: 140 };

export const SHOE = { x: 1420, y: 120 };
/** Cleared cards fly off the top-left edge of the table. */
export const DISCARD = { x: 60, y: -180 };
export const DEALER = { x: 800, y: 175 };

const TABLE_CENTER = { x: 800, y: 40 };
const SEAT_RADIUS = { x: 660, y: 600 };
const FIRST_SEAT_DEGREES = 158;
const SEAT_STEP_DEGREES = (FIRST_SEAT_DEGREES - 22) / (SEAT_COUNT - 1);

export interface Point {
	x: number;
	y: number;
}

/** Seats sit on an arc, seat 0 on the left as players see it. */
export function seatPosition(index: number): Point {
	const angle = ((FIRST_SEAT_DEGREES - index * SEAT_STEP_DEGREES) * Math.PI) / 180;
	return {
		x: TABLE_CENTER.x + SEAT_RADIUS.x * Math.cos(angle),
		y: TABLE_CENTER.y + SEAT_RADIUS.y * Math.sin(angle),
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
