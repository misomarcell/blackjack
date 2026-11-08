import { CHIP_VALUES } from '@blackjack/shared/protocol';
import { Container, Graphics, Text } from 'pixi.js';
import { colors, textStyles } from './palette';

type ChipValue = (typeof CHIP_VALUES)[number];

/** Taller stacks are cut off, so a big bet never towers over the cards. */
const MAX_PER_STACK = 9;
const CHIP_RADIUS = 27;
const CHIP_THICKNESS = 5;
/** How flat the chip faces look: the felt is seen from above at an angle. */
const TILT = 0.8;

/** Chip colors, matching the chip buttons in the Angular betting panel. */
const chipColors: Record<ChipValue, number> = {
	5: colors.red,
	25: colors.green,
	100: colors.sky,
	500: 0x8b5cf6,
};

/** Where each stack sits on the betting spot, by how many stacks there are (largest value first). */
const STACK_SPOTS: Record<number, [number, number][]> = {
	1: [[0, 0]],
	2: [
		[-27, 5],
		[27, -3],
	],
	3: [
		[-28, 12],
		[28, 10],
		[0, -17],
	],
	4: [
		[-27, 15],
		[27, 15],
		[-26, -17],
		[26, -17],
	],
};

/** A tiny seeded random generator, so a stack keeps its exact wobble from one snapshot to the next. */
function seededRandom(seed: number): () => number {
	let state = seed >>> 0 || 1;
	return () => {
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		return ((state >>> 0) % 10_000) / 10_000;
	};
}

/** How many chips of each value make up `amount`, largest value first. */
function chipCounts(amount: number): [ChipValue, number][] {
	const counts: [ChipValue, number][] = [];
	let rest = amount;
	for (const value of [...CHIP_VALUES].reverse()) {
		const count = Math.floor(rest / value);
		if (count > 0) {
			counts.push([value, count]);
			rest -= count * value;
		}
	}
	return counts;
}

/** The chip color a shade darker, for its edge. */
function edgeColor(color: number): number {
	const channel = (shift: number): number => Math.round(((color >> shift) & 0xff) * 0.68) << shift;
	return channel(16) | channel(8) | channel(0);
}

/** A chip seen at an angle: an elliptical face on a short striped edge, so stacked chips show their height. */
function drawChip(value: ChipValue): Graphics {
	const ry = CHIP_RADIUS * TILT;
	const chip = new Graphics()
		.ellipse(0, CHIP_THICKNESS, CHIP_RADIUS, ry)
		.rect(-CHIP_RADIUS, 0, CHIP_RADIUS * 2, CHIP_THICKNESS)
		.fill(edgeColor(chipColors[value]))
		.ellipse(0, CHIP_THICKNESS, CHIP_RADIUS, ry)
		.stroke({ width: 3, color: colors.ink });
	// White inlays around the edge, like a real casino chip.
	for (const x of [-0.7, 0, 0.7]) {
		chip.rect(x * CHIP_RADIUS - 3, 1, 6, CHIP_THICKNESS).fill({ color: colors.white, alpha: 0.85 });
	}
	return chip
		.ellipse(0, 0, CHIP_RADIUS, ry)
		.fill(chipColors[value])
		.stroke({ width: 3, color: colors.ink })
		.ellipse(0, 0, CHIP_RADIUS * 0.62, ry * 0.62)
		.stroke({ width: 2.5, color: colors.white, alpha: 0.85 });
}

/** The value printed in the middle of the top chip, like the chip buttons, laid flat on its face. */
function chipLabel(value: number): Text {
	const label = new Text({ text: String(value), style: textStyles.chip });
	label.anchor.set(0.5);
	label.scale.set(0.8, 0.8 * TILT);
	return label;
}

/** One stack of same-value chips, each chip a little off-center like a hand-placed pile. */
function stackOf(value: ChipValue, count: number, random: () => number): Container {
	const stack = new Container();
	const shown = Math.min(count, MAX_PER_STACK);
	for (let index = 0; index < shown; index++) {
		const chip = drawChip(value);
		chip.position.set((random() - 0.5) * 3, -index * CHIP_THICKNESS + (random() - 0.5) * 1.5);
		if (index === shown - 1) {
			chip.addChild(chipLabel(value));
		}
		stack.addChild(chip);
	}
	return stack;
}

/**
 * A bet as chips on the felt: one stack per chip value, side by side with a little random spread.
 * `seed` keeps the spread stable for a seat, so redrawing the same bet does not shuffle the chips.
 */
export function chipStacks(amount: number, seed: number): Container {
	const pile = new Container();
	pile.sortableChildren = true;
	const counts = chipCounts(amount);
	const spots = STACK_SPOTS[counts.length] ?? [];
	counts.forEach(([value, count], index) => {
		const random = seededRandom(seed * 7919 + value);
		const [x, y] = spots[index] ?? [0, 0];
		const stack = stackOf(value, count, random);
		stack.position.set(x + (random() - 0.5) * 6, y + (random() - 0.5) * 5);
		// Stacks nearer the viewer (lower on screen) are drawn in front.
		stack.zIndex = stack.y;
		pile.addChild(stack);
	});
	return pile;
}
